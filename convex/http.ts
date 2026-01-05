import { auth } from "./auth";
import router from "./router";
import { twilio } from "./sms";

const http = router;

auth.addHttpRoutes(http);

// Register Twilio webhook routes for SMS status updates
twilio.registerRoutes(http);

export default http;
