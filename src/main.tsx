import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App";
import { PublicContentViewer } from "./components/PublicContentViewer";
import { SharedContentViewer } from "./components/SharedContentViewer";
import { VerifyEmail } from "./components/VerifyEmail";
import { CheckoutSuccess, CheckoutCancel } from "./components/CheckoutResult";
import { BrandColorProvider } from "./components/ThemeProvider";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <BrandColorProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/view/:contentId" element={<PublicContentViewer />} />
          <Route path="/share/:accessToken" element={<SharedContentViewer />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </BrandColorProvider>
  </ConvexAuthProvider>
);
