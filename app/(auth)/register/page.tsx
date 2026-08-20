import Link from "next/link";
import { register } from "./actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error === "exists" ? "An account with that email already exists." : params.error ? "Please check your details and try again." : null;

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Lumina / workspace</p>
        <h1>Create your account</h1>
        <p className="auth-copy">A quiet place to think, write, and work through ideas.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form action={register} className="auth-form">
          <label>Name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <label>Password<input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label>
          <button type="submit">Create account</button>
        </form>
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
