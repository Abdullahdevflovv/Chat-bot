import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; registered?: string }> }) {
  const params = await searchParams;
  const error = params.error ? "Your email or password is incorrect." : null;

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Lumina / workspace</p>
        <h1>Welcome back</h1>
        <p className="auth-copy">Pick up the thread whenever you are ready.</p>
        {params.registered && <p className="form-success">Account created. You can sign in now.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <LoginForm />
        <p className="auth-switch">New to Lumina? <Link href="/register">Create an account</Link></p>
      </section>
    </main>
  );
}
