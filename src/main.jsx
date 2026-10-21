import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";
import "./styles/layout.css";
import "./styles/enhancements.css";
// Polish layer: loaded last so it overrides the sheets above.
import "./styles/polish/tokens.css";
import "./styles/polish/grid.css";
import "./styles/polish/shell.css";
import "./styles/polish/studio.css";
import "./styles/polish/modals.css";
import "./styles/polish/radius.css";
import "./styles/polish/links.css";
// Message / platform tray above the view switch.
import "./styles/composer.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


