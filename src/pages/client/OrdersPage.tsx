import { OrderHistory } from "@/components/OrderHistory";

export function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">
        Order History
      </h1>
      <OrderHistory />
    </div>
  );
}
