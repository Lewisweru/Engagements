import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Instagram, Twitter, Youtube, DollarSign, Users, Activity, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface AccountStats {
  totalSales: number;
  activeListings: number;
  pendingOrders: number;
}

interface AccountListing {
  _id: string;
  platform: "instagram" | "twitter" | "youtube";
  followers: number;
  price: number;
  status: "active" | "pending" | "sold";
  title?: string;
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<AccountStats>({
    totalSales: 0,
    activeListings: 0,
    pendingOrders: 0,
  });
  const [listings, setListings] = useState<AccountListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) {
        setError("Please login to view dashboard");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1. Get user data first
        const userRes = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/users/${currentUser.uid}`,
          {
            headers: {
              Authorization: `Bearer ${await currentUser.getIdToken()}`,
            },
          }
        );

        if (!userRes.ok) {
          throw new Error("Failed to fetch user data");
        }

        const userData = await userRes.json();
        const sellerId = userData._id;

        // 2. Fetch listings and orders in parallel
        const [listingsRes, ordersRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/listings?sellerId=${sellerId}`),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders?sellerId=${sellerId}`),
        ]);

        // Handle errors
        if (!listingsRes.ok || !ordersRes.ok) {
          const listingsError = await listingsRes.json().catch(() => null);
          const ordersError = await ordersRes.json().catch(() => null);
          throw new Error(
            listingsError?.message || ordersError?.message || "Failed to fetch dashboard data"
          );
        }

        // Process data
        const [listingsData, ordersData] = await Promise.all([
          listingsRes.json(),
          ordersRes.json(),
        ]);

        setListings(listingsData);
        setStats({
          totalSales: ordersData.totalSales || 0,
          activeListings: listingsData.length,
          pendingOrders: ordersData.pendingOrders || 0,
        });

      } catch (err: any) {
        console.error("Dashboard error:", err);
        setError(err.message || "Failed to load dashboard");
        toast.error(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const PlatformIcon = ({ platform }: { platform: string }) => {
    const icons = {
      instagram: <Instagram className="h-5 w-5 text-pink-500" />,
      twitter: <Twitter className="h-5 w-5 text-blue-400" />,
      youtube: <Youtube className="h-5 w-5 text-red-500" />,
    };
    return icons[platform as keyof typeof icons] || null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <p>Please login to view dashboard</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser.email || "User"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <DollarSign className="h-8 w-8 text-green-500" />,
              value: `Ksh ${stats.totalSales.toLocaleString()}`,
              label: "Total Sales",
            },
            {
              icon: <Users className="h-8 w-8 text-blue-500" />,
              value: stats.activeListings,
              label: "Active Listings",
            },
            {
              icon: <Activity className="h-8 w-8 text-purple-500" />,
              value: stats.pendingOrders,
              label: "Pending Orders",
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="bg-card p-6 rounded-lg shadow-lg"
            >
              <div className="flex items-center justify-between">
                {stat.icon}
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="mt-2 text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Listings Tab */}
        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-6">
            {listings.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <p className="text-muted-foreground">No listings found</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {listings.map((listing) => (
                  <motion.div
                    key={listing._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card p-4 rounded-lg shadow flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <PlatformIcon platform={listing.platform} />
                      <div>
                        <h3 className="font-semibold">
                          {listing.title || `${listing.platform} Account`}
                        </h3>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span>{listing.followers.toLocaleString()} followers</span>
                          <span>•</span>
                          <span className="capitalize">{listing.status}</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-medium">
                      Ksh {listing.price.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}