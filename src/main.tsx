import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App";
import { PublicContentViewer } from "./components/PublicContentViewer";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <BrowserRouter>
      <Routes>
        <Route path="/view/:contentId" element={<PublicContentViewer />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
    <Toaster />
  </ConvexAuthProvider>
);
