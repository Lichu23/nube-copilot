import { MessageBubble } from "@/components/chat/message-bubble";
import { ToolResultTable } from "@/components/chat/tool-result-table";

export function ChatPanel() {
  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="space-y-4">
          <MessageBubble role="user" content="Compare this week vs last week." />
          <MessageBubble
            role="assistant"
            content="Chat orchestration is scaffolded. Once metrics exist, answers will include evidence, tables, and charts."
          />
        </div>
      </div>

      <ToolResultTable />
    </section>
  );
}
