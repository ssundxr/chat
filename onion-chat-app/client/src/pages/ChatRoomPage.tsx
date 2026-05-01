import { FormEvent, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useEphemeralRoom } from "../hooks/useEphemeralRoom";
import { formatTime } from "../utils/time";

const DEFAULT_TTL = Number(import.meta.env.VITE_DEFAULT_TTL_SECONDS ?? 420);

export function ChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = useMemo(() => decodeURIComponent(params.roomId ?? ""), [params.roomId]);
  const { clientId, peers, connected, status, messages, sendMessage, resetSession } = useEphemeralRoom(roomId);

  const [draft, setDraft] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(DEFAULT_TTL);
  const [burnAfterRead, setBurnAfterRead] = useState(false);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }

    await sendMessage(text, ttlSeconds, burnAfterRead);
    setDraft("");
  }

  const roomLink = `${window.location.origin}/room/${encodeURIComponent(roomId)}`;

  return (
    <main className="shell">
      <section className="card stack room-head">
        <div>
          <h2>Room {roomId}</h2>
          <p className="muted">Client ID: {clientId}</p>
          <p className={connected ? "status status-on" : "status status-off"}>{status}</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => navigator.clipboard.writeText(roomLink)}>
            Copy Invite Link
          </button>
          <button className="btn" onClick={() => void resetSession()}>
            Session Reset
          </button>
          <Link className="btn" to="/launch">
            Leave Room
          </Link>
        </div>
      </section>

      <section className="card stack room-grid">
        <aside className="panel stack">
          <h3>Peers ({peers.length})</h3>
          {peers.length === 0 ? <p className="muted">No peers connected.</p> : null}
          {peers.map((peer) => (
            <p key={peer.clientId}>{peer.clientId}</p>
          ))}
          <p className="warn">Use Tor Browser for maximum anonymity.</p>
        </aside>

        <article className="chat-box">
          {messages.length === 0 ? <p className="muted">No messages yet.</p> : null}
          {messages.map((message) => (
            <div key={message.id} className={message.outgoing ? "msg msg-out" : "msg"}>
              <p className="msg-meta">
                {message.outgoing ? "You" : message.senderId} at {formatTime(message.createdAt)}
              </p>
              <p>{message.text}</p>
              <p className="msg-exp">expires {formatTime(message.expiresAt)}</p>
            </div>
          ))}
        </article>
      </section>

      <section className="card">
        <form className="stack" onSubmit={onSend}>
          <label htmlFor="draft">Encrypted message</label>
          <textarea
            id="draft"
            rows={3}
            placeholder="Type securely..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />

          <div className="inline-options">
            <label>
              TTL (300-600 sec)
              <input
                type="number"
                min={300}
                max={600}
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(Number(e.target.value))}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={burnAfterRead}
                onChange={(e) => setBurnAfterRead(e.target.checked)}
              />
              Burn after reading
            </label>
          </div>

          <button className="btn btn-primary" disabled={!connected || !roomId} type="submit">
            Send Ciphertext ({peers.length} recipient(s))
          </button>
        </form>
      </section>
    </main>
  );
}
