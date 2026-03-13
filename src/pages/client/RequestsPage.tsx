import { MyPurchaseRequests } from "@/components/MyPurchaseRequests";

export function RequestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">
        My Requests
      </h1>
      <MyPurchaseRequests />
    </div>
  );
}
