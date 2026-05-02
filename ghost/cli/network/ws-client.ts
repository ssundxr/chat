import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import type { StartupContext } from "../ui/startup.js";
import { createEnvelope, isBlackMambaEnvelope } from "../../shared/protocol.js";
import { encryptAes256Gcm, decryptAes256Gcm } from "../crypto/aes.js";
import { deriveSharedSecret, hkdfSha256 } from "../crypto/ecdh.js";

type PeerKeyRecord = {
  sender: string;
  fingerprint: string;
};

type SendResult = {
  messageId: string;
  envelope: string;
};

export type BlackMambaClientEvents = {
  status: (message: string) => void;
  peer_update: (peers: PeerKeyRecord[]) => void;
  message: (entry: { sender: string; text: string; timestamp: number; messageId: string }) => void;
  burn: () => void;
  ghost_expires_at: (ts: number) => void;
  close: () => void;
};

const WS_URL = process.env.BLACK_MAMBA_WS_URL ?? "ws://13.53.212.66:8090";
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_MS = 1000;

export class BlackMambaWsClient extends EventEmitter {
  private socket: WebSocket | null = null;
  private readonly peers = new Map<string, PeerKeyRecord>();
  private clientId = "";
  private reconnectAttempts = 0;
  private isLeaving = false;
  private proxyAgent: unknown = undefined;

  constructor(
    private readonly roomId: string,
    private readonly context: StartupContext
  ) {
    super();
  }

  setProxyAgent(agent: unknown): void {
    this.proxyAgent = agent;
  }

  async connect(clientId: string): Promise<void> {
    this.clientId = clientId;
    await this._connectOnce();
  }

  private async _connectOnce(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const wsOptions: WebSocket.ClientOptions = {};
      if (this.proxyAgent) {
        (wsOptions as Record<string, unknown>).agent = this.proxyAgent;
      }
      const socket = new WebSocket(WS_URL, wsOptions);
      this.socket = socket;

      socket.on("open", () => {
        this.reconnectAttempts = 0;
        const torLabel = this.proxyAgent ? " {#FF6600-fg}[TOR]{/#FF6600-fg}" : "";
        this.emit("status", `link established :: relay ${WS_URL}${torLabel}`);

        socket.send(
          JSON.stringify(
            createEnvelope("join", this.roomId, randomUUID(), this.context.session.publicKeyDerB64, {
              clientId: this.clientId,
              fingerprint: this.context.fingerprint
            })
          )
        );

        socket.send(
          JSON.stringify(
            createEnvelope("key_exchange", this.roomId, randomUUID(), this.context.session.publicKeyDerB64, {
              clientId: this.clientId,
              fingerprint: this.context.fingerprint,
              publicKey: this.context.session.publicKeyDerB64
            })
          )
        );
        resolve();
      });

      socket.on("message", async (raw) => {
        const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : Buffer.from(raw as ArrayBuffer).toString("utf8");
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return;
        }

        if (!isBlackMambaEnvelope(parsed)) {
          return;
        }

        try {
          await this.handleEnvelope(parsed);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.emit("status", `packet error: ${message}`);
        }
      });

      socket.on("close", () => {
        if (this.isLeaving) {
          this.emit("close");
          return;
        }
        this._attemptReconnect();
      });

      socket.on("error", (error) => {
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });
    });
  }

  private _attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.emit("status", `{red-fg}[relay]{/red-fg} connection lost — max retries reached. session terminated.`);
      this.emit("close");
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts - 1);
    this.emit("status", `{yellow-fg}[relay]{/yellow-fg} disconnected — reconnecting... attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} (${delay}ms)`);

    setTimeout(async () => {
      try {
        await this._connectOnce();
        this.emit("status", `{green-fg}[relay]{/green-fg} reconnected successfully`);
        this.socket?.send(
          JSON.stringify(
            createEnvelope("join", this.roomId, randomUUID(), this.context.session.publicKeyDerB64, {
              clientId: this.clientId,
              fingerprint: this.context.fingerprint
            })
          )
        );
        this.socket?.send(
          JSON.stringify(
            createEnvelope("key_exchange", this.roomId, randomUUID(), this.context.session.publicKeyDerB64, {
              clientId: this.clientId,
              fingerprint: this.context.fingerprint,
              publicKey: this.context.session.publicKeyDerB64
            })
          )
        );
      } catch {
        this._attemptReconnect();
      }
    }, delay);
  }

  private async handleEnvelope(envelope: ReturnType<typeof createEnvelope>): Promise<void> {
    switch (envelope.type) {
      case "join":
      case "key_exchange": {
        const sender = String(envelope.sender);
        const fingerprint = String(envelope.payload.fingerprint ?? "");
        if (sender && fingerprint && sender !== this.context.session.publicKeyDerB64) {
          const isNew = !this.peers.has(sender);
          this.peers.set(sender, { sender, fingerprint });
          this.emit("peer_update", Array.from(this.peers.values()));

          if (isNew && envelope.type === "join") {
            this.emit("status", `{#00FF41-fg}[+]{/#00FF41-fg} node online :: ${fingerprint.slice(0, 16).toUpperCase()}`);
            this.socket?.send(
              JSON.stringify(
                createEnvelope("key_exchange", this.roomId, randomUUID(), this.context.session.publicKeyDerB64, {
                  clientId: this.clientId,
                  fingerprint: this.context.fingerprint,
                  publicKey: this.context.session.publicKeyDerB64
                })
              )
            );
          }
        }
        break;
      }
      case "leave": {
        const leavingSender = String(envelope.sender);
        if (this.peers.has(leavingSender)) {
          const peer = this.peers.get(leavingSender);
          this.peers.delete(leavingSender);
          this.emit("peer_update", Array.from(this.peers.values()));
          const fp = peer?.fingerprint.slice(0, 16).toUpperCase() ?? leavingSender.slice(0, 12).toUpperCase();
          this.emit("status", `{red-fg}[-]{/red-fg} node offline :: ${fp}`);
        }
        break;
      }
      case "message": {
        const recipients = envelope.payload.recipients as Record<string, { ivB64: string; ciphertextB64: string; authTagB64: string }> | undefined;
        if (!recipients) {
          break;
        }

        const myBlob = recipients[this.context.session.publicKeyDerB64];
        if (!myBlob) {
          break;
        }

        const senderSecret = deriveSharedSecret(this.context.session.ecdh, envelope.sender);
        const aesKey = await hkdfSha256(senderSecret, Buffer.from(envelope.roomId, "utf8"), Buffer.from(envelope.messageId, "utf8"));
        const text = decryptAes256Gcm(aesKey, myBlob, Buffer.from(envelope.roomId, "utf8"));

        this.emit("message", {
          sender: envelope.sender,
          text,
          timestamp: envelope.timestamp,
          messageId: envelope.messageId
        });

        this.socket?.send(
          JSON.stringify(
            createEnvelope("ack", envelope.roomId, randomUUID(), this.context.session.publicKeyDerB64, {
              clientId: this.context.session.publicKeyDerB64,
              messageId: envelope.messageId
            })
          )
        );
        break;
      }
      case "burn": {
        this.emit("burn");
        break;
      }
      case "rate_limited": {
        const reason = String(envelope.payload.reason ?? "rate limit exceeded");
        this.emit("status", `{red-fg}[!] THROTTLED{/red-fg} :: ${reason}`);
        break;
      }
      case "ghost_tick": {
        const expiresAt = Number(envelope.payload.expiresAt ?? 0);
        if (expiresAt > 0) {
          this.emit("ghost_expires_at", expiresAt);
        }
        break;
      }
      default:
        break;
    }
  }

  async sendMessage(text: string, clientId: string, burnAfterRead = true): Promise<SendResult> {
    const messageId = randomUUID();
    const recipients: Record<string, { ivB64: string; ciphertextB64: string; authTagB64: string }> = {};

    for (const peer of this.peers.values()) {
      const secret = deriveSharedSecret(this.context.session.ecdh, peer.sender);
      const key = await hkdfSha256(secret, Buffer.from(this.roomId, "utf8"), Buffer.from(messageId, "utf8"));
      recipients[peer.sender] = encryptAes256Gcm(key, text, Buffer.from(this.roomId, "utf8"));
    }

    const envelope = createEnvelope("message", this.roomId, messageId, this.context.session.publicKeyDerB64, {
      clientId,
      burnAfterRead,
      recipients
    });

    this.socket?.send(JSON.stringify(envelope));
    return { messageId, envelope: JSON.stringify(envelope) };
  }

  sendBurn(): void {
    this.socket?.send(
      JSON.stringify(
        createEnvelope("burn", this.roomId, randomUUID(), this.context.session.publicKeyDerB64, {
          clientId: this.clientId
        })
      )
    );
  }

  leave(clientId: string): void {
    this.isLeaving = true;
    this.socket?.send(
      JSON.stringify(
        createEnvelope("leave", this.roomId, randomUUID(), this.context.session.publicKeyDerB64, {
          clientId
        })
      )
    );
    this.socket?.close();
  }

  getPeers(): PeerKeyRecord[] {
    return Array.from(this.peers.values());
  }
}
