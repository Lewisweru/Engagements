// pages/DashboardPage.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { DollarSign, Users, Activity, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from '@/contexts/AuthContext'; // Import the configured apiClient

// Interface for the expected API response structure for stats
interface OrderStats {
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
  // Add other stats fields if your backend returns them
}

export default function DashboardPage() {
  const { currentUser, appUser, loading: authLoading, loadingAppUser } = useAuth();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !currentUser) {
        setLoadingStats(authLoading); // Set loading true only if auth is still loading
        if (!authLoading && !currentUser) {
             setError("Please log in to view the dashboard.");
        }
      return;
    }

    const fetchDashboardData = async () => {
      setLoadingStats(true);
      setError(null);
      // Don't reset stats here, keep old stats while loading new ones
      // setStats(null);

      try {
        // Use apiClient - token is automatically attached
        const apiUrl = `/orders/stats`; // Use relative path
        console.log("[DashboardPage] Fetching stats from:", apiUrl);

        const response = await apiClient.get<OrderStats>(apiUrl); // Use OrderStats type

        console.log(`[DashboardPage] Fetch successful`);
        setStats(response.data);

      } catch (err: any) {
        console.error("[DashboardPage] Stats fetch error:", err);
        const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || err.message || "An unexpected error occurred";
        setError(`Failed to load dashboard stats: ${errorMessage}`);
        toast.error(`Error loading dashboard stats`);
      } finally {
        console.log("[DashboardPage] Setting stats loading to false.");
        setLoadingStats(false);
      }
    };

    fetchDashboardData();

  }, [currentUser, authLoading]);


  // --- Conditional Rendering ---

  if (authLoading) {
      return (
          <div className="flex justify-center items-center min-h-[300px]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading Session...</span>
          </div>
      );
  }

  if (!currentUser) {
      return (
          <div className="max-w-xl mx-auto text-center py-8 px-4">
              <p className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-4 rounded-md shadow border border-red-200 dark:border-red-800/50">
                  <strong>Error:</strong> Please log in to view the dashboard.
              </p>
          </div>
      );
  }

  // Display Welcome Header even while loading stats or appUser
  const WelcomeHeader = () => (
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {loadingAppUser
              ? <span className="flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> Loading user...</span>
              : `Welcome back, ${appUser?.name || appUser?.username || currentUser?.email || 'User'}`
            }
          </p>
        </div>
  );

  // --- Main Render Logic ---
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WelcomeHeader />

      {/* Stats Loading/Error/Display Area */}
      {loadingStats ? (
         <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading dashboard stats...</span>
        </div>
      ) : error ? (
           <div className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-4 rounded-md shadow border border-red-200 dark:border-red-800/50 flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p><strong>Error:</strong> {error}</p>
          </div>
      ) : !stats ? (
           <div className="text-center py-8 text-muted-foreground">
                No dashboard statistics available.
            </div>
      ) : (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Active Orders Card */}
                    <motion.div whileHover={{ scale: 1.03, y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-card p-6 rounded-lg shadow-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                        <Users className="h-6 w-6 text-blue-500" />
                        </div>
                        <p className="text-3xl font-bold">{stats.activeOrders}</p>
                    </motion.div>
                    {/* Pending Orders Card */}
                    <motion.div whileHover={{ scale: 1.03, y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-card p-6 rounded-lg shadow-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                        <Activity className="h-6 w-6 text-purple-500" />
                        </div>
                        <p className="text-3xl font-bold">{stats.pendingOrders}</p>
                    </motion.div>
                    {/* Completed Orders Card */}
                    <motion.div whileHover={{ scale: 1.03, y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-card p-6 rounded-lg shadow-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Completed Orders</p>
                        <DollarSign className="h-6 w-6 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold">{stats.completedOrders}</p>
                    </motion.div>
                </div>
            </motion.div>
        )}
    </div>
  );
}