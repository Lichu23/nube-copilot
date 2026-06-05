import { ChatPanel } from "@/components/chat/chat-panel";
import { AppShell } from "@/components/layout/app-shell";

export default function ChatPage() {
  return (
    <AppShell
      eyebrow="AI chat"
      title="Business analyst chat"
      description="The model will call backend tools, never Tiendanube directly, and never invent metrics."
    >
      <ChatPanel />
    </AppShell>
  );
}
