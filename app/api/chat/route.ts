import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI provider is not configured." }, { status: 503 });
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
  if (!content || content.length > 12000) return NextResponse.json({ error: "Message must be between 1 and 12,000 characters." }, { status: 400 });

  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: session.user.id } })
    : null;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId: session.user.id, title: content.slice(0, 48) },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, userId: session.user.id, role: "user", content },
  });

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { role: true, content: true },
  });
  const modelHistory = history.filter(
    (message: { role: string }) => message.role === "user" || message.role === "assistant",
  ) as { role: "user" | "assistant"; content: string }[];

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are Lumina, a thoughtful and precise AI assistant. Use markdown when it improves clarity." },
      ...modelHistory,
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  });

  const encoder = new TextEncoder();
  let assistantContent = "";
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            assistantContent += text;
            controller.enqueue(encoder.encode(text));
          }
        }
        await prisma.message.create({
          data: { conversationId: conversation.id, userId: session.user.id, role: "assistant", content: assistantContent },
        });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "x-conversation-id": conversation.id },
  });
}
