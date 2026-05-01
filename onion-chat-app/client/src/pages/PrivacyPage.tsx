import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <main className="shell">
      <section className="card stack">
        <h2>Privacy Model</h2>
        <ul>
          <li>Client-side E2EE: messages are encrypted before leaving your browser.</li>
          <li>Relay-only backend: server sees metadata and ciphertext envelopes, not plaintext.</li>
          <li>No accounts: no login system, no user profile database.</li>
          <li>No cookies/tracking: app avoids persistent browser identifiers.</li>
          <li>Ephemeral memory: room state and pending envelopes live in-memory only.</li>
          <li>Message TTL: automatic expiration from room memory.</li>
          <li>Burn-after-read: server purges envelope after all recipients acknowledge.</li>
        </ul>

        <p className="warn">Use Tor Browser for maximum anonymity. Regular browsers do not hide your network identity.</p>

        <Link className="btn btn-primary" to="/launch">
          Launch Chat
        </Link>
      </section>
    </main>
  );
}
