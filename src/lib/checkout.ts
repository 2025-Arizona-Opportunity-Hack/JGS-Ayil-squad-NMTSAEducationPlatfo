const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;

// Create a Stripe Checkout Session for a pending order via the Convex HTTP
// endpoint and send the browser there. Used by the Shop and the /view/
// paywall so there is a single copy of the checkout hand-off.
export async function redirectToStripeCheckout(orderId: string): Promise<void> {
  const response = await fetch(
    `${CONVEX_URL.replace(".cloud", ".site")}/api/stripe/checkout`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create checkout session");
  }

  const { url } = await response.json();
  window.location.href = url;
}
