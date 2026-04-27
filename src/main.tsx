import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Service worker is intentionally disabled to prevent stale fallback HTML from
// being served by an older Workbox cache. We unregister anything that exists
// and clear caches once per page load — without re-registering — so the app
// always boots from the latest network response.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    })
    .catch(() => {});
  if ("caches" in window) {
    caches
      .keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .catch(() => {});
  }
}
