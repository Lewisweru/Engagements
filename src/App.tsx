// src/App.tsx (Corrected - REMOVE AuthProvider from here)

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import EngagementPage from "./pages/EngagementPage";
import AuthPage from "./pages/AuthPage";
import AdminDashboardPage from './pages/AdminDashboardPage';
import { ThemeProvider } from "./components/ThemeProvider";
import PaymentCallbackPage from "./pages/PaymentCallbackPage";

function App() {
  return (
      <ThemeProvider defaultTheme="dark" storageKey="social-marketplace-theme">
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/engagement" element={<EngagementPage />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Ensure this path matches the callbackUrl used in handleCheckout */}
                <Route path="/payment-callback" element={<PaymentCallbackPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              </Routes>
            </main>
            <Footer />
            <Toaster position="bottom-right" />
          </div>
        </Router>
      </ThemeProvider>
  );
}

export default App;