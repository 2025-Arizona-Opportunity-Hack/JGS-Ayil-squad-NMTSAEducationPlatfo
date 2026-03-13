import { ShareLinksManager } from "@/components/ShareLinksManager";

export function SharesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">My Shares</h1>
      <ShareLinksManager />
    </div>
  );
}
