import { createRoot } from "react-dom/client";
// CSS first: component stylesheets (imported by App's subtree) must come AFTER
// the global sheet in the cascade so their equal-specificity overrides win.
import "lenis/dist/lenis.css";
import "./styles/global.css";
import App from "./App";

// Note: StrictMode is intentionally omitted — its dev double-invoke of effects
// restarts the preloader/GSAP timelines and Lenis, which makes animation work
// miserable. All effects still clean up properly.
createRoot(document.getElementById("root")!).render(<App />);
