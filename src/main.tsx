import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

window.requestAnimationFrame(() => {
  window.setTimeout(() => document.body.classList.add("app-ready"), 450);
});
