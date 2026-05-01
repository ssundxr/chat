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
  close: () => void;
};

const WS_URL = process.env.BLACK_MAMBA_WS_URL ?? "ws://13.53.212.66:8090";

export class BlackMambaWsClient extends EventEmitter {
  private socket: WebSocket | null = null;
  private readonly peers = new Map<string, PeerKeyRecord>();
  private clientId = "";

  constructor(
    private readonly roomId: string,
    private readonly context: StartupContext
  ) {
    super();
  }

  async connect(clientId: string): Promise<void> {
    this.clientId = clientId;
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(WS_URL);
      this.socket = socket;

      socket.on("open", () => {
        this.emit("status", `Connected to relay at ${WS_URL}`);
        const joinMessageId = randomUUID();
        socket.send(
          JSON.stringify(
            createEnvelope("join", this.roomId, joinMessageId, this.context.session.publicKeyDerB64, {
              clientId,
              fingerprint: this.context.fingerprint
            })
          )
        );

        const keyExchangeMessageId = randomUUID();
        socket.send(
          JSON.stringify(
            createEnvelope("key_exchange", this.roomId, keyExchangeMessageId, this.context.session.publicKeyDerB64, {
              clientId,
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
          this.emit("status", `Packet handling error: ${message}`);
        }
      });

      socket.on("close", () => {
        this.emit("close");
      });

      socket.on("error", (error) => {
        reject(error);
      });
    });
  }

  private async handleEnvelope(envelope: ReturnType<typeof createEnvelope>): Promise<void> {
    switch (envelope.type) {
      case "join":
      case "key_exchange": {
        const sender = String(envelope.sender);
        const fingerprint = String(envelope.payload.fingerprint ?? "");
        if (sender && fingerprint) {
          this.peers.set(sender, { sender, fingerprint });
          this.emit("peer_update", Array.from(this.peers.values()));

          if (envelope.type === "join" && sender !== this.context.session.publicKeyDerB64) {
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

  leave(clientId: string): void {
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
