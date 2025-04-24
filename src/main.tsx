// src/main.tsx (Corrected - Wrap App with AuthProvider)

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx'; // Your main App component with Router and Routes
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx'; // Import AuthProvider

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Failed to find the root element with ID 'root'");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    {/* Wrap the entire App component with AuthProvider here */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);