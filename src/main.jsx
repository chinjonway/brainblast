import React from "react";
import ReactDOM from "react-dom/client";
import BrainBlast from "../brainblast.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrainBlast />
  </React.StrictMode>
);
