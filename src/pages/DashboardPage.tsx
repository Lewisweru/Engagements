import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Instagram, Twitter, Youtube, DollarSign, Users, Activity } from "lucide-react";
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

  // Fetch data on component mount
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // ✅ Fetch MongoDB user ID using Firebase UID
        const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/${currentUser.uid}`);
        const userData = await userRes.json();
        if (!userRes.ok) throw new Error(userData.message || "User not found");

        const sellerId = userData._id; // ✅ Get MongoDB User ID

        // ✅ Fetch Listings (Filter by sellerId)
        const listingsRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/listings?sellerId=${sellerId}`);
        const listingsData = await listingsRes.json();
        if (!listingsRes.ok) throw new Error(listingsData.message || "Failed to fetch listings");
        setListings(listingsData);

        // ✅ Fetch Orders (Filter by sellerId)
        const ordersRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders?sellerId=${sellerId}`);
        const ordersData = await ordersRes.json();
        if (!ordersRes.ok) throw new Error(ordersData.message || "Failed to fetch orders");

        setStats({
          totalSales: ordersData.totalSales || 0,
          activeListings: listingsData.length,
          pendingOrders: ordersData.pendingOrders || 0,
        });
      } catch (error: any) {
        console.error("Dashboard Data Fetch Error:", error);
        toast.error(error.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-5 w-5 text-pink-500" />;
      case "twitter":
        return <Twitter className="h-5 w-5 text-blue-400" />;
      case "youtube":
        return <Youtube className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!currentUser) {
    return <div className="text-center py-8">Please log in to access the dashboard.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser?.email}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div whileHover={{ scale: 1.02 }} className="bg-card p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-green-500" />
              <span className="text-2xl font-bold">Ksh {stats.totalSales.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-muted-foreground">Total Sales</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="bg-card p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold">{stats.activeListings}</span>
            </div>
            <p className="mt-2 text-muted-foreground">Active Listings</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="bg-card p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <Activity className="h-8 w-8 text-purple-500" />
              <span className="text-2xl font-bold">{stats.pendingOrders}</span>
            </div>
            <p className="mt-2 text-muted-foreground">Pending Orders</p>
          </motion.div>
        </div>

        <Tabs defaultValue="listings" className="w-full">
          <TabsList>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-6">
            <div className="grid gap-6">
              {listings.map((listing) => (
                <motion.div key={listing._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card p-6 rounded-lg shadow-lg flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <PlatformIcon platform={listing.platform} />
                    <div>
                      <h3 className="font-semibold capitalize">{listing.platform} Account</h3>
                      <p className="text-sm text-muted-foreground">{listing.followers.toLocaleString()} followers</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">Ksh {listing.price}</span>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}