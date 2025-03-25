import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  return (
    <nav className="w-full bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
              SocialMarket
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <Link to="/marketplace">
              <Button variant="ghost">Marketplace</Button>
            </Link>
            <Link to="/engagement">
              <Button variant="ghost">Engagement</Button>
            </Link>
            {currentUser && (
              <Link to="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
            )}

            {/* Sell an Account Button */}
            {currentUser && (
              <Link to="/create-listing">
                <Button variant="default" className="bg-green-500 hover:bg-green-600">
                  Sell an Account
                </Button>
              </Link>
            )}

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* User Auth Actions */}
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm">{currentUser.email}</span>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <div className="px-4 py-2 space-y-2">
            <Link to="/marketplace" className="block text-white py-2 hover:bg-gray-700 px-3 rounded">
              Marketplace
            </Link>
            <Link to="/engagement" className="block text-white py-2 hover:bg-gray-700 px-3 rounded">
              Engagement
            </Link>
            {currentUser && (
              <Link to="/dashboard" className="block text-white py-2 hover:bg-gray-700 px-3 rounded">
                Dashboard
              </Link>
            )}
            {currentUser && (
              <Link
                to="/create-listing"
                className="block text-center py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Sell an Account
              </Link>
            )}
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="w-full text-left py-2 px-3 text-white hover:bg-gray-700 rounded"
              >
                Sign Out
              </button>
            ) : (
              <Link to="/auth" className="block py-2 px-3 text-white hover:bg-gray-700 rounded">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
