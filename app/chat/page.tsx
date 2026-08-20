import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: { id: true, title: true, pinned: true, updatedAt: true },
  });

  return <ChatWorkspace user={{ name: session.user.name, email: session.user.email }} initialConversations={conversations} />;
}
