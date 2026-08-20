# Lumina

Lumina is a production-oriented AI chat workspace built with Next.js 16, TypeScript, Auth.js credentials authentication, Prisma 7, PostgreSQL, and Groq streaming.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_SECRET`, and `GROQ_API_KEY`.
2. Create the PostgreSQL database, then run:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`. Users register and sign in through the server-backed auth flow. Conversations and messages are stored in PostgreSQL; Groq requests only run on the server.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```
