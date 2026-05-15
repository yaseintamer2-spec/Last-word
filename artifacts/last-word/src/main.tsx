import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("LAST LETTER: JS Start");

try {
    const rootEl = document.getElementById("root");
    if (!rootEl) throw new Error("Root element not found");

    createRoot(rootEl).render(<App />);
    console.log("LAST LETTER: Rendered");
} catch (err) {
    console.error("LAST LETTER: CRITICAL BOOT ERROR", err);
    document.body.innerHTML = `<div style="background:black;color:red;padding:20px;font-family:sans-serif;">
        <h1>Critical Boot Error</h1>
        <pre>${err instanceof Error ? err.message : String(err)}</pre>
    </div>`;
}
