import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Inject auth token into all API requests
setAuthTokenGetter(() => {
  try {
    const stored = localStorage.getItem("infra-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token ?? null;
    }
  } catch {}
  return null;
});

createRoot(document.getElementById("root")!).render(<App />);
