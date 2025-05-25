/**
 * @fileoverview Main React Entry Point - Application bootstrap and initialization
 * 
 * PURPOSE:
 * Bootstraps the React application with necessary providers and development tools.
 * Serves as the bridge between the HTML document and the React component tree.
 * 
 * SETUP RESPONSIBILITIES:
 * - React DOM rendering with StrictMode for development warnings
 * - Browser routing with dynamic basename support
 * - Development tooling initialization (Tempo devtools)
 * - Global CSS imports for Tailwind and custom styles
 * 
 * DEVELOPMENT FEATURES:
 * - StrictMode enables additional runtime checks
 * - Tempo devtools for hot-reloading and route generation
 * - Dynamic basename for deployment flexibility (GitHub Pages, subdirectories)
 * 
 * PRODUCTION CONSIDERATIONS:
 * - StrictMode is automatically stripped in production builds
 * - Tempo devtools are dev-only and won't affect production bundle
 * - Basename configuration supports deployment to subdirectories
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";                                    // Global Tailwind CSS styles
import { BrowserRouter } from "react-router-dom";

// === DEVELOPMENT TOOLING ===
// Initialize Tempo development tools for hot-reloading and route generation
import { TempoDevtools } from "tempo-devtools";
TempoDevtools.init();

// === ROUTING CONFIGURATION ===
// Dynamic basename supports deployment to subdirectories (e.g., GitHub Pages)
const basename = import.meta.env.BASE_URL;

// === APPLICATION BOOTSTRAP ===
// Render the React application into the DOM with necessary providers
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
