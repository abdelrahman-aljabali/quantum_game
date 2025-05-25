/**
 * @fileoverview App Component - Root application component and provider setup
 * 
 * ARCHITECTURE:
 * This is the main entry point that sets up the core application structure:
 * - Global blockchain state management via EthereumProvider
 * - React Router for navigation (currently single-page)
 * - Suspense boundary for lazy loading
 * - Development routing support via Tempo
 * 
 * PROVIDER HIERARCHY:
 * App
 * └── EthereumProvider (blockchain state)
 *     └── Suspense (loading states)
 *         └── Routes (navigation)
 *             └── Home (main game interface)
 * 
 * DESIGN DECISIONS:
 * - EthereumProvider at root ensures blockchain state is available everywhere
 * - Suspense provides graceful loading experience for code-split components
 * - Simple routing structure appropriate for single-page game application
 * - Tempo integration for development hot-reloading and route generation
 */

import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import routes from "tempo-routes";
import { EthereumProvider } from "./contexts/EthereumContext";

/**
 * @component App
 * @description Root component that provides blockchain context and routing
 * 
 * PROVIDER SETUP:
 * - EthereumProvider: Manages wallet connection, contract instances, game state
 * - Suspense: Handles loading states for lazy-loaded components
 * - Routes: Single route to Home component (expandable for future features)
 * 
 * DEVELOPMENT FEATURES:
 * - Tempo routes for development hot-reloading (VITE_TEMPO env flag)
 * - Fallback loading indicator for better UX during code splitting
 */
function App() {
  return (
    <EthereumProvider>
      <Suspense fallback={<p>Loading...</p>}>
        <>
          {/* Main application routes */}
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
          
          {/* Development-only: Tempo route hot-reloading */}
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </>
      </Suspense>
    </EthereumProvider>
  );
}

export default App;
