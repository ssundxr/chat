import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRoomId } from "../utils/id";

export function CreateJoinPage() {
  const navigate = useNavigate();
  const [inputRoomId, setInputRoomId] = useState("");
  const suggestedId = useMemo(() => createRoomId(), []);

  function openRoom(roomId: string) {
    navigate(`/room/${encodeURIComponent(roomId)}`);
  }

  function onJoin(e: FormEvent) {
    e.preventDefault();
    if (inputRoomId.trim()) {
      openRoom(inputRoomId.trim());
    }
  }

  return (
    <main className="shell">
      <section className="card stack">
        <h2>Create or Join Room</h2>
        <p>Room IDs are random and unlinked to identity. Share the full room URL over a secure channel.</p>

        <div className="panel">
          <p>Suggested room:</p>
          <code>{suggestedId}</code>
          <button className="btn btn-primary" onClick={() => openRoom(suggestedId)}>
            Create Secure Room
          </button>
        </div>

        <form className="stack" onSubmit={onJoin}>
          <label htmlFor="roomId">Join existing room</label>
          <input
            id="roomId"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            placeholder="abcd-1234-efgh"
            autoComplete="off"
          />
          <button className="btn" type="submit">
            Join Room
          </button>
        </form>

        <p className="muted">
          Tor warning: use the onion domain and Tor Browser when network anonymity is required.
        </p>
        <Link to="/privacy">Read Privacy Guarantees</Link>
      </section>
    </main>
  );
}
