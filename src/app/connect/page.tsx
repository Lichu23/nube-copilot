import { AppShell } from "@/components/layout/app-shell";

export default function ConnectPage() {
  return (
    <AppShell
      eyebrow="Connection"
      title="Connect a Tiendanube store"
      description="This page will host the install button, connection state, and sync kickoff."
    >
      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-zinc-600">
        Pending implementation: install button, status messaging, and secure OAuth start flow.
      </div>
    </AppShell>
  );
}
