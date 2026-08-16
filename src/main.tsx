import React, { useCallback } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import "./index.css";
import App from "./App";
import { PublicContentViewer } from "./components/PublicContentViewer";
import { SharedContentViewer } from "./components/SharedContentViewer";
import { CertificateView } from "./components/CertificateView";
import { VerifyEmail } from "./components/VerifyEmail";
import { ResetPassword } from "./components/ResetPassword";
import { CheckoutSuccess, CheckoutCancel } from "./components/CheckoutResult";
import { BrandColorProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppSignOutContext } from "./lib/appAuth";
import { isExternalAuth } from "./lib/authMode";
import { ExternalAuthProvider } from "./lib/externalAuth";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

if (import.meta.env.DEV) {
  import("@axe-core/react").then((axe) => {
    import("react-dom").then((ReactDOM) => {
      axe.default(React, ReactDOM, 1000);
    });
  });
}

function ConvexSignOutBridge({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuthActions();
  const appSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);
  return (
    <AppSignOutContext.Provider value={appSignOut}>
      {children}
    </AppSignOutContext.Provider>
  );
}

const appTree = (
  <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
    <BrandColorProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/view/:contentId" element={<PublicContentViewer />} />
            <Route path="/share/:accessToken" element={<SharedContentViewer />} />
            <Route path="/certificate/:shareToken" element={<CertificateView />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            {/* Password reset is a Convex Auth flow; external providers host
                their own account recovery. */}
            {!isExternalAuth && (
              <Route path="/reset-password" element={<ResetPassword />} />
            )}
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-center" />
    </BrandColorProvider>
  </NextThemesProvider>
);

createRoot(document.getElementById("root")!).render(
  isExternalAuth ? (
    <ExternalAuthProvider client={convex}>{appTree}</ExternalAuthProvider>
  ) : (
    <ConvexAuthProvider client={convex}>
      <ConvexSignOutBridge>{appTree}</ConvexSignOutBridge>
    </ConvexAuthProvider>
  )
);
