import { useState, useEffect } from "react"; // Import React
import { useAuth } from "@/contexts/AuthContext"; // Ensure path is correct
import { motion } from "framer-motion";
import { DollarSign, Users, Activity, Loader2 } from "lucide-react"; // Added Loader2
import toast from "react-hot-toast";

// Interface for the expected API response structure for stats
interface OrderStats {
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<OrderStats | null>(null); // Initialize stats as null
  const [loading, setLoading] = useState<boolean>(true); // Add loading state, start as true
  const [error, setError] = useState<string | null>(null); // Keep error state

  // Fetch data on component mount or when currentUser changes
  useEffect(() => {
    console.log("DashboardPage Effect: Running. currentUser:", currentUser ? currentUser.uid : 'null');
    // Reset states when currentUser changes (e.g., logout/login)
    setLoading(true);
    setError(null);
    setStats(null);

    if (!currentUser) {
      console.log("DashboardPage Effect: No currentUser, setting error.");
      setError("Please log in to view the dashboard.");
      setLoading(false); // Stop loading if no user
      return; // Exit effect early
    }

    const fetchDashboardData = async () => {
      let token = null; // Declare token variable outside try block
      try {
        console.log("DashboardPage Effect: Fetching token for user:", currentUser.uid);
        token = await currentUser.getIdToken(); // Get token first
        console.log("DashboardPage Effect: Token obtained.");

        const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api/orders/stats?userId=${currentUser.uid}`;
        console.log("DashboardPage Effect: Fetching stats from:", apiUrl);

        const ordersRes = await fetch(apiUrl, {
          method: 'GET', // Explicitly state GET method
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json' // Usually not needed for GET but doesn't hurt
          },
        });

        console.log(`DashboardPage Effect: Fetch response status: ${ordersRes.status}`);

        if (!ordersRes.ok) {
           let errorBody = `Status: ${ordersRes.status} ${ordersRes.statusText}`;
           try {
                const errorJson = await ordersRes.json(); // Try parsing JSON error from backend
                errorBody = errorJson.message || JSON.stringify(errorJson);
           } catch (parseError) {
                // If parsing fails, use text
                try {
                    errorBody = await ordersRes.text();
                } catch (textError) { /* Ignore further errors */ }
           }
           console.error("API Error Response Body:", errorBody);
           throw new Error(`Failed to fetch order stats: ${errorBody}`);
        }

        const statsData: OrderStats = await ordersRes.json();
        console.log("DashboardPage Effect: Stats data received:", statsData);

        // Validate received data structure
        if (typeof statsData.activeOrders !== 'number' ||
            typeof statsData.pendingOrders !== 'number' ||
            typeof statsData.completedOrders !== 'number') {
            console.error("Invalid stats data format:", statsData);
            throw new Error("Invalid stats data format received from server.");
        }

        setStats(statsData); // Set the fetched stats
        console.log("DashboardPage Effect: Stats state updated.");

      } catch (err) {
        console.error("Dashboard fetch catch block:", err);
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage); // Set error state for display
        toast.error(`Error loading dashboard stats: ${errorMessage}`); // Show toast notification
      } finally {
        console.log("DashboardPage Effect: Setting loading to false.");
        setLoading(false); // Stop loading regardless of success or failure
      }
    };

    fetchDashboardData();

  }, [currentUser]); // Dependency array is correct

  // --- Conditional Rendering ---

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading Dashboard...</span>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-8 px-4">
        <p className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-4 rounded-md shadow border border-red-200 dark:border-red-800/50">
            <strong>Error:</strong> {error}
        </p>
         {/* You could add a retry button here */}
         {/* <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button> */}
      </div>
    );
  }

  // 3. No Stats Data (but no error and not loading) - Indicates successful fetch but empty/invalid data
   if (!stats) {
     return (
       <div className="text-center py-8 text-muted-foreground">
         Could not load dashboard statistics or no data available.
       </div>
     );
   }

  // 4. Success State - Render Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
             Welcome back, {currentUser?.displayName || currentUser?.email || 'User'}
          </p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Orders Card */}
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="bg-card p-6 rounded-lg shadow-lg border border-border"
          >
            <div className="flex items-center justify-between mb-2">
               <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
               <Users className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{stats.activeOrders}</p>
          </motion.div>

          {/* Pending Orders Card */}
          <motion.div
             whileHover={{ scale: 1.03, y: -2 }}
             transition={{ type: "spring", stiffness: 300, damping: 15 }}
             className="bg-card p-6 rounded-lg shadow-lg border border-border"
          >
            <div className="flex items-center justify-between mb-2">
               <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
               <Activity className="h-6 w-6 text-purple-500" />
            </div>
            <p className="text-3xl font-bold">{stats.pendingOrders}</p>
          </motion.div>

          {/* Completed Orders Card */}
          <motion.div
             whileHover={{ scale: 1.03, y: -2 }}
             transition={{ type: "spring", stiffness: 300, damping: 15 }}
             className="bg-card p-6 rounded-lg shadow-lg border border-border"
          >
            <div className="flex items-center justify-between mb-2">
               <p className="text-sm font-medium text-muted-foreground">Completed Orders</p>
               <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{stats.completedOrders}</p>
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
}