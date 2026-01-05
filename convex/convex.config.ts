import { defineApp } from "convex/server";
import resend from "@convex-dev/resend/convex.config.js";
import twilio from "@convex-dev/twilio/convex.config.js";

const app = defineApp();
app.use(resend);
app.use(twilio);

export default app;
