import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesignSystemProvider } from "@senvenli/react";
import { App } from "./App.tsx";
import "./tailwind.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesignSystemProvider locale="en">
      <App />
    </DesignSystemProvider>
  </StrictMode>,
);
