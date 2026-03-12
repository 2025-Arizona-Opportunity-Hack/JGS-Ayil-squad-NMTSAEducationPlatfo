import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

// --- Stripe Checkout ---

http.route({
  path: "/api/stripe/checkout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { orderId } = body as { orderId: string };

      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required" }), {
          status: 400,
          headers: corsHeaders(),
        });
      }

      // Fetch the order details
      const order = await ctx.runQuery(
        internal.stripe_helpers.getOrderDetails,
        { orderId: orderId as Id<"orders"> }
      );

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: corsHeaders(),
        });
      }

      if (order.status !== "pending") {
        return new Response(
          JSON.stringify({ error: "Order is not in pending status" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      // Call the Node.js action to create a Stripe Checkout Session
      const session = await ctx.runAction(
        internal.stripe.createCheckoutSessionAction,
        {
          orderId,
          amount: order.amount,
          currency: order.currency,
          contentTitle: order.contentTitle || "Content Purchase",
          contentDescription: order.contentDescription || undefined,
          contentId: order.contentId || "",
          userId: order.userId,
        }
      );

      // Save the Stripe session ID on the order
      await ctx.runMutation(internal.stripe_helpers.setStripeSessionId, {
        orderId: orderId as Id<"orders">,
        stripeSessionId: session.sessionId,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: corsHeaders(),
      });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Internal server error",
        }),
        { status: 500, headers: corsHeaders() }
      );
    }
  }),
});

// CORS preflight for checkout
http.route({
  path: "/api/stripe/checkout",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

// --- Stripe Webhook ---

http.route({
  path: "/api/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    try {
      // Verify signature and parse event in Node.js action
      const event = await ctx.runAction(
        internal.stripe.verifyWebhookAction,
        { body, signature }
      );

      if (event.type === "checkout.session.completed" && event.orderId) {
        await ctx.runMutation(internal.orders.completeOrderInternal, {
          orderId: event.orderId as Id<"orders">,
          stripeSessionId: event.sessionId || "",
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("Webhook processing failed", { status: 400 });
    }
  }),
});

function corsHeaders() {
  const allowedOrigin = process.env.SITE_URL || "http://localhost:5173";
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default http;
