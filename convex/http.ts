import { auth } from "./auth";
import router from "./router";
import { getTwilio, isTwilioConfigured } from "./sms";

const http = router;

auth.addHttpRoutes(http);

// Register Twilio webhook routes for SMS status updates (only if configured)
if (isTwilioConfigured()) {
  getTwilio().registerRoutes(http);
}

export default http;
