type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-zinc-950 text-white" : "border border-black/10 bg-zinc-50 text-zinc-800"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
