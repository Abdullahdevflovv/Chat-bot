"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const [pending, setPending] = useState(false);

  return (
    <form
      className="auth-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const form = new FormData(event.currentTarget);
        await signIn("credentials", {
          email: form.get("email"),
          password: form.get("password"),
          callbackUrl: "/chat",
        });
        setPending(false);
      }}
    >
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
      <button type="submit" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
    </form>
  );
}
