import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import MarketplacePage from "./pages/MarketplacePage";
import EngagementPage from "./pages/EngagementPage";
import AuthPage from "./pages/AuthPage";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import PaymentCallbackPage from "./pages/PaymentCallbackPage"; // ✅ Import the success page

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="social-marketplace-theme">
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/engagement" element={<EngagementPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/payment-success" element={<PaymentCallbackPage />} /> {/* ✅ New Route */}
              </Routes>
            </main>
            <Footer />
            <Toaster position="bottom-right" />
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
