import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = localStorage.getItem('empatiq-theme');
const initialTheme = savedTheme === 'light' || savedTheme === 'dark'
  ? savedTheme
  : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

document.documentElement.classList.remove('light', 'dark');
document.documentElement.classList.add(initialTheme);
document.documentElement.style.colorScheme = initialTheme;

createRoot(document.getElementById("root")!).render(<App />);

if (window.matchMedia('(display-mode: standalone)').matches) {
  document.body.classList.add('app-standalone');
}

window.requestAnimationFrame(() => {
  window.setTimeout(() => document.body.classList.add("app-ready"), 450);
});
