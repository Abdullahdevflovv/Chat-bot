import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redactSensitiveOutput, systemPrompt, validateUserInput } from "@/lib/ai/guardrails";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;

  const validation = validateUserInput(content);
  if (!validation.allowed) return NextResponse.json({ error: validation.reason }, { status: 400 });
  const safeContent = validation.text;

  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: session.user.id } })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId: session.user.id, title: safeContent.slice(0, 48) },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, userId: session.user.id, role: "user", content: safeContent },
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

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY. Configure the bike assistant before use." }, { status: 500 });
  }

  let assistantContent: string;
  try {
    const groq = new Groq({ apiKey: groqApiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...modelHistory],
      temperature: 0.6,
      max_tokens: 500,
    });

    assistantContent = completion.choices?.[0]?.message?.content ?? "";
  } catch (error) {
    console.error("Bike guardrail model error:", error);
    return NextResponse.json({ error: "Bike assistant is unavailable right now. Please try again." }, { status: 503 });
  }

  if (!assistantContent.trim()) {
    return NextResponse.json({ error: "Bike assistant returned an empty response." }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const safeAssistantContent = redactSensitiveOutput(assistantContent);
        controller.enqueue(encoder.encode(safeAssistantContent));

        if (!safeAssistantContent.trim()) throw new Error("The model returned an empty response.");

        await prisma.message.create({
          data: { conversationId: conversation.id, userId: session.user.id, role: "assistant", content: safeAssistantContent },
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

