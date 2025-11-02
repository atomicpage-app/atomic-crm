export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>atomic-crm API</h1>
      <p>Rotas principais:</p>
      <ul>
        <li>POST /api/lead</li>
        <li>GET /api/confirm?token=...</li>
      </ul>
    </main>
  );
}
