import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="shell shell-hero">
      <section className="card hero-grid">
        <div>
          <p className="kicker">EPHEMERAL ONION CHAT</p>
          <h1>Anonymous messaging with end-to-end encryption by default.</h1>
          <p>
            No accounts, no tracking, no plaintext visibility on the relay. Rooms are temporary and messages self-expire.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/launch">
              Launch Chat
            </Link>
            <Link className="btn" to="/privacy">
              Privacy Mode
            </Link>
          </div>
        </div>
        <aside className="terminal">
          <p>&gt; protocol: ECDH P-256 + AES-256-GCM</p>
          <p>&gt; identity: ephemeral per-room keys</p>
          <p>&gt; relay: ciphertext envelopes only</p>
          <p>&gt; retention: TTL + burn-after-read</p>
          <p className="warn">Use Tor Browser for maximum anonymity.</p>
        </aside>
      </section>
    </main>
  );
}
