import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decryptMessage, derivePeerAesKey, encryptMessage, exportPublicKeyJwk, generateEcdhKeyPair, importPublicKeyJwk } from "../utils/crypto";
import { createClientId, createMessageId } from "../utils/id";
import { clampTtlSeconds } from "../utils/time";

type PeerInfo = {
  clientId: string;
  publicKeyJwk: JsonWebKey;
  joinedAt: number;
};

type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  expiresAt: number;
  outgoing: boolean;
};

type RelayMessageEvent = {
  event: "relay_message";
  roomId: string;
  messageId: string;
  senderId: string;
  createdAt: number;
  expiresAt: number;
  burnAfterRead: boolean;
  envelope: {
    toClientId: string;
    nonceB64: string;
    ciphertextB64: string;
  };
};

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws";

export function useEphemeralRoom(roomId: string) {
  const [clientId] = useState(() => createClientId());
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Connecting");

  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const peerPublicRef = useRef<Map<string, CryptoKey>>(new Map());
  const peerSymmetricRef = useRef<Map<string, CryptoKey>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  const activePeerCount = peers.length;

  const setPeer = useCallback((peer: PeerInfo) => {
    setPeers((prev) => {
      const without = prev.filter((entry) => entry.clientId !== peer.clientId);
      return [...without, peer].sort((a, b) => a.joinedAt - b.joinedAt);
    });
  }, []);

  const removePeer = useCallback((id: string) => {
    setPeers((prev) => prev.filter((peer) => peer.clientId !== id));
    peerPublicRef.current.delete(id);
    peerSymmetricRef.current.delete(id);
  }, []);

  const deriveKeyForPeer = useCallback(async (peerId: string, peerPublicJwk: JsonWebKey) => {
    if (!keyPairRef.current?.privateKey) {
      return;
    }

    const peerKey = await importPublicKeyJwk(peerPublicJwk);
    const shared = await derivePeerAesKey(keyPairRef.current.privateKey, peerKey);
    peerPublicRef.current.set(peerId, peerKey);
    peerSymmetricRef.current.set(peerId, shared);
  }, []);

  const connect = useCallback(async () => {
    const keyPair = await generateEcdhKeyPair();
    keyPairRef.current = keyPair;
    const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);

    const socket = new WebSocket(WS_URL);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      setStatus("Connected");
      socket.send(
        JSON.stringify({
          event: "join_room",
          roomId,
          clientId,
          publicKeyJwk
        })
      );
    };

    socket.onclose = () => {
      setConnected(false);
      setStatus("Disconnected");
      wsRef.current = null;
    };

    socket.onerror = () => {
      setStatus("WebSocket error");
    };

    socket.onmessage = async (evt) => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(evt.data as string) as Record<string, unknown>;
      } catch {
        return;
      }

      if (payload.event === "room_snapshot") {
        const snapshotPeers = (payload.peers as PeerInfo[] | undefined) ?? [];
        for (const peer of snapshotPeers) {
          if (!peer.publicKeyJwk || peer.clientId === clientId) {
            continue;
          }
          await deriveKeyForPeer(peer.clientId, peer.publicKeyJwk);
          setPeer(peer);
        }
        setStatus(`Secure room ready (${snapshotPeers.length} peer(s))`);
      }

      if (payload.event === "peer_joined") {
        const peerId = payload.clientId as string;
        const peerPublic = payload.publicKeyJwk as JsonWebKey;
        if (peerId && peerPublic && peerId !== clientId) {
          await deriveKeyForPeer(peerId, peerPublic);
          setPeer({
            clientId: peerId,
            publicKeyJwk: peerPublic,
            joinedAt: Number(payload.joinedAt ?? Date.now())
          });
          setStatus(`Peer joined (${peerId})`);
        }
      }

      if (payload.event === "peer_left") {
        const peerId = payload.clientId as string;
        if (peerId) {
          removePeer(peerId);
          setStatus(`Peer left (${peerId})`);
        }
      }

      if (payload.event === "session_reset") {
        const peerId = payload.clientId as string;
        const peerPublic = payload.publicKeyJwk as JsonWebKey;
        if (peerId && peerPublic) {
          await deriveKeyForPeer(peerId, peerPublic);
          setStatus(`Peer session reset (${peerId})`);
        }
      }

      if (payload.event === "relay_message") {
        const relay = payload as unknown as RelayMessageEvent;
        const senderKey = peerSymmetricRef.current.get(relay.senderId);
        if (!senderKey) {
          return;
        }

        try {
          const text = await decryptMessage(senderKey, relay.envelope);
          setMessages((prev) => [
            ...prev,
            {
              id: relay.messageId,
              senderId: relay.senderId,
              text,
              createdAt: relay.createdAt,
              expiresAt: relay.expiresAt,
              outgoing: false
            }
          ]);

          wsRef.current?.send(
            JSON.stringify({
              event: "ack_message",
              roomId,
              messageId: relay.messageId,
              clientId
            })
          );
        } catch {
          setStatus("Failed to decrypt message. Session reset may be required.");
        }
      }
    };
  }, [clientId, deriveKeyForPeer, removePeer, roomId, setPeer]);

  useEffect(() => {
    void connect();

    const gcInterval = setInterval(() => {
      const now = Date.now();
      setMessages((prev) => prev.filter((msg) => msg.expiresAt > now));
    }, 1000);

    return () => {
      clearInterval(gcInterval);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: "leave_room",
            roomId,
            clientId
          })
        );
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [clientId, connect, roomId]);

  const sendMessage = useCallback(
    async (text: string, ttlSecondsInput: number, burnAfterRead: boolean) => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setStatus("Not connected");
        return;
      }

      const ttlSeconds = clampTtlSeconds(ttlSecondsInput);
      const createdAt = Date.now();
      const expiresAt = createdAt + ttlSeconds * 1000;
      const messageId = createMessageId();

      const envelopes: Array<{ toClientId: string; nonceB64: string; ciphertextB64: string }> = [];
      for (const peer of peers) {
        const key = peerSymmetricRef.current.get(peer.clientId);
        if (!key) {
          continue;
        }
        const encrypted = await encryptMessage(key, text);
        envelopes.push({
          toClientId: peer.clientId,
          nonceB64: encrypted.nonceB64,
          ciphertextB64: encrypted.ciphertextB64
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          senderId: clientId,
          text,
          createdAt,
          expiresAt,
          outgoing: true
        }
      ]);

      if (envelopes.length > 0) {
        socket.send(
          JSON.stringify({
            event: "chat_envelopes",
            roomId,
            messageId,
            senderId: clientId,
            createdAt,
            ttlSeconds,
            burnAfterRead,
            envelopes
          })
        );
      }
    },
    [clientId, peers, roomId]
  );

  const resetSession = useCallback(async () => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const newPair = await generateEcdhKeyPair();
    keyPairRef.current = newPair;
    const publicKeyJwk = await exportPublicKeyJwk(newPair.publicKey);

    peerPublicRef.current.clear();
    peerSymmetricRef.current.clear();

    socket.send(
      JSON.stringify({
        event: "session_reset",
        roomId,
        clientId,
        publicKeyJwk
      })
    );

    for (const peer of peers) {
      await deriveKeyForPeer(peer.clientId, peer.publicKeyJwk);
    }

    setStatus("Session keys rotated");
  }, [clientId, deriveKeyForPeer, peers, roomId]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages]
  );

  return {
    clientId,
    peers,
    activePeerCount,
    connected,
    status,
    messages: sortedMessages,
    sendMessage,
    resetSession
  };
}
