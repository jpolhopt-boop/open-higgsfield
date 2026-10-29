import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b0c",
        color: "#e8e8ea",
        font: "16px/1.5 system-ui, sans-serif",
      }}
    >
      <form method="post" action="/api/login" style={{ width: "100%", maxWidth: 320, display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Studio</h1>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          required
          autoFocus
          style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #333", background: "#151517", color: "inherit", font: "inherit" }}
        />
        {error && <p style={{ margin: 0, color: "#ff6b6b", fontSize: 14 }}>Wrong password.</p>}
        <button
          type="submit"
          style={{ padding: "12px 14px", borderRadius: 10, border: 0, background: "#e8e8ea", color: "#0b0b0c", font: "inherit", cursor: "pointer" }}
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
