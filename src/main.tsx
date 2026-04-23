import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Ensure light theme only (cleanup any previously persisted dark mode)
document.documentElement.classList.remove("dark");
try { localStorage.removeItem("wbu-theme"); } catch {}

createRoot(document.getElementById("root")!).render(<App />);
