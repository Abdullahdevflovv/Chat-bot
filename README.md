# Lumina

Lumina is a bike-focused AI chat workspace built with Next.js 16, TypeScript, Auth.js credentials authentication, Prisma 7, PostgreSQL, and direct Groq streaming.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_SECRET`, and `GROQ_API_KEY`.
2. Create the PostgreSQL database, then run:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`. Users register and sign in through the server-backed auth flow. Conversations and messages are stored in PostgreSQL.

## Custom bike guardrails

The app now runs its own bike-product guardrails in the Next.js API route instead of relying on a separate NeMo service. The guardrail layer validates user input, blocks prompt-injection attempts, redacts sensitive keys, and keeps the assistant focused on bicycles, accessories, fit, maintenance, and safe rider guidance.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```
