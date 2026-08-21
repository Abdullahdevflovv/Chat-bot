"use client";

import { useState } from "react";
import { Menu, Plus, Search, Send, Sparkles, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { signOut } from "next-auth/react";

type Conversation = { id: string; title: string | null; pinned: boolean; updatedAt: Date };
type Message = { id: string; role: string; content: string };

export function ChatWorkspace({ user, initialConversations }: { user: { name: string | null; email: string | null }; initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function selectConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`);
    if (!response.ok) return;
    const conversation = await response.json();
    setActiveId(id);
    setMessages(conversation.messages);
    setSidebarOpen(false);
  }

  async function sendMessage(event?: React.FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || streaming) return;
    setInput("");
    setStreaming(true);
    const temporaryId = `user-${Date.now()}`;
    const placeholderId = `assistant-${Date.now()}`;
    setMessages((current) => [...current, { id: temporaryId, role: "user", content }, { id: placeholderId, role: "assistant", content: "" }]);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: activeId, content }) });
      if (!response.ok || !response.body) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error ?? "Unable to send message.");
      }
      const returnedId = response.headers.get("x-conversation-id");
      if (returnedId && returnedId !== activeId) {
        setActiveId(returnedId);
        setConversations((current) => [{ id: returnedId, title: content.slice(0, 48), pinned: false, updatedAt: new Date() }, ...current]);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + text } : message));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((current) => {
        const lastMessage = current[current.length - 1];
        if (lastMessage && lastMessage.role === "assistant" && !lastMessage.content.trim()) {
          return [...current.slice(0, -1), { ...lastMessage, content: message }];
        }
        return [...current, { id: `error-${Date.now()}`, role: "assistant", content: message }];
      });
    } finally {
      setStreaming(false);
    }
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    if (activeId === id) { setActiveId(null); setMessages([]); }
  }

  const isEmpty = messages.length === 0;
  return (
    <main className="chat-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top"><div className="brand-mark"><Sparkles size={17} /> Lumina</div><button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <button className="new-chat" onClick={() => { setActiveId(null); setMessages([]); setSidebarOpen(false); }}><Plus size={17} /> New conversation</button>
        <div className="history-heading"><span>Your conversations</span><Search size={15} /></div>
        <div className="history-list">{conversations.map((conversation) => <div className={`history-item ${activeId === conversation.id ? "selected" : ""}`} key={conversation.id}><button onClick={() => selectConversation(conversation.id)}>{conversation.title || "Untitled conversation"}</button><button className="delete-button" onClick={() => deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title || "conversation"}`}><Trash2 size={14} /></button></div>)}</div>
        <div className="account"><div className="avatar">{(user.name || user.email || "U").charAt(0).toUpperCase()}</div><div className="account-copy"><strong>{user.name || "Your account"}</strong><span>{user.email}</span></div><button className="sign-out" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button></div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />}
      <section className="chat-main"><header className="chat-header"><button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button><span>{activeId ? conversations.find((item) => item.id === activeId)?.title || "Conversation" : "New conversation"}</span><span className="status-dot" /></header>
        <div className={`message-area ${isEmpty ? "empty" : ""}`}>{isEmpty ? <div className="welcome"><div className="welcome-icon"><Sparkles size={24} /></div><p className="eyebrow">A clearer starting point</p><h1>What are you working through?</h1><p>Ask for a plan, explore an idea, or turn a rough thought into something useful.</p></div> : <div className="messages">{messages.map((message) => <article className={`message ${message.role}`} key={message.id}><div className="message-label">{message.role === "user" ? "You" : "Lumina"}</div><div className="message-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || "Thinking..."}</ReactMarkdown></div></article>)}</div>}</div>
        <form className="composer-wrap" onSubmit={sendMessage}><div className="composer"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Message Lumina..." rows={1} disabled={streaming} /><button className="send-button" type="submit" disabled={!input.trim() || streaming} aria-label="Send message"><Send size={17} /></button></div><span className="composer-note">Lumina can make mistakes. Check important details.</span></form>
      </section>
    </main>
  );
}
