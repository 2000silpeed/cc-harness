import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../docs/features/pm-program-tracker/ontology/design-system/tokens.css";
import "../docs/features/pm-program-tracker/ontology/design-system/runtime-theme.css";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("앱 진입 요소를 찾을 수 없습니다.");
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
