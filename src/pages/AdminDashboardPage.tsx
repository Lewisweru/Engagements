// src/pages/AdminDashboardPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // For getting user info
import { Button } from "@/components/ui/button";
import { Loader2, Check, RefreshCw, AlertCircle, ExternalLink, ShieldAlert } from "lucide-react"; // Icons
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/contexts/AuthContext'; // Import apiClient

// ... (Keep existing interfaces AdminOrderDocument, PaginatedOrdersResponse, STATUS_OPTIONS) ...
interface AdminOrderDocument {
    _id: string;
    pesapalOrderId: string;
    pesapalTrackingId?: string;
    userId?: { // Optional because populate might fail or not exist
        _id: string;
        email?: string;
        name?: string;
        username?: string;
    };
    platform: string;
    service: string;
    quality: 'standard' | 'high';
    accountLink: string;
    quantity: number;
    amount: number;
    currency: string;
    status: 'Pending Payment' | 'Payment Failed' | 'Processing' | 'Completed' | 'Cancelled' | 'Expired' | 'Supplier Error'; // Ensure all statuses are here
    paymentStatus?: string; // Last known from Pesapal
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
}
interface PaginatedOrdersResponse {
    orders: AdminOrderDocument[];
    page: number;
    pages: number;
    total: number;
}
const STATUS_OPTIONS: AdminOrderDocument['status'][] = [
    'Processing', 'Pending Payment', 'Completed', 'Payment Failed', 'Cancelled', 'Expired', 'Supplier Error'
];


export default function AdminDashboardPage() {
    // Use appUser for role check, currentUser for auth state
    const { currentUser, appUser, loading: authLoading, loadingAppUser } = useAuth();
    const navigate = useNavigate();

    const [orders, setOrders] = useState<AdminOrderDocument[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Loading for the order list
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<AdminOrderDocument['status']>('Processing');
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

    // Derived state: Is the current user an admin based on appUser?
    const isAdminUser = appUser?.role === 'admin';

    // Authorization Check Effect (Combined with Initial Loading)
    useEffect(() => {
        // Wait for both Firebase auth and app user data loading
        if (!authLoading && !loadingAppUser) {
             if (!currentUser) {
                toast.error("Please log in to access the admin area.");
                navigate('/auth');
            } else if (!isAdminUser) {
                 toast.error("Access Forbidden: Admin privileges required.");
                 navigate('/dashboard'); // Redirect non-admins
            } else {
                 // User is logged in and is admin, allow component to proceed
                 // Fetch initial data if not already loading
                 if (isLoading) { // Check isLoading to prevent double fetch on fast re-renders
                    fetchOrders();
                 }
            }
        }
    }, [currentUser, appUser, authLoading, loadingAppUser, isAdminUser, navigate, isLoading]); // Added isLoading

    // Fetch orders based on filter
    const fetchOrders = useCallback(async () => {
        // Ensure user is authenticated and determined to be admin before fetching
        if (!currentUser || !isAdminUser) {
            console.log("[AdminDash] Skipping fetch: Not authenticated or not admin.");
            setIsLoading(false); // Stop loading if prerequisites aren't met
            return;
        };

        setIsLoading(true);
        setError(null);
        console.log(`[AdminDash] Fetching admin orders with status: ${filterStatus}`);

        try {
            // apiClient automatically adds the token
            const apiUrl = `/orders/admin/all?status=${filterStatus}`;
            console.log("[AdminDash] Calling Admin API:", apiUrl);

            const response = await apiClient.get<PaginatedOrdersResponse>(apiUrl);

            console.log("[AdminDash] Admin API Response Status:", response.status);
            const data = response.data;
            console.log("[AdminDash] Admin Orders Received:", data);
            setOrders(data.orders || []);
            // Update pagination state here if needed

        } catch (err: any) {
            console.error("[AdminDash] Error fetching admin orders:", err);
             const message = err.response?.data?.error?.message || err.response?.data?.message || err.message || "An unknown error occurred";
             // Handle specific backend errors like 403 Forbidden more explicitly if needed
             if (err.response?.status === 403) {
                 setError("Access Forbidden: You might not have admin privileges on the server.");
                 toast.error("Admin access denied by server.");
                 // Optionally navigate away again, though the initial check should prevent this
                 // navigate('/dashboard');
             } else {
                 setError(`Error loading orders: ${message}`);
                 toast.error(`Error loading orders: ${message}`);
             }
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    // Depend on isAdminUser as well to refetch if role changes (unlikely but possible)
    }, [currentUser, filterStatus, isAdminUser]);

    // Effect to fetch orders when filter changes (only if user is admin)
    useEffect(() => {
        if (isAdminUser && !authLoading && !loadingAppUser) {
             // Don't fetch initially here, let the auth check effect handle it
             // Only fetch when filterStatus changes *after* initial load/auth check
             // This requires tracking initial load state separately or adjusting logic
             // Simpler approach: fetchOrders is called by the main useEffect when ready
        }
    }, [filterStatus, isAdminUser, authLoading, loadingAppUser]);


    // Handler to mark an order as completed
    const handleMarkComplete = useCallback(async (orderId: string) => {
         if (!currentUser || !isAdminUser || updatingOrderId === orderId) return;

        setUpdatingOrderId(orderId);

        try {
            console.log(`[AdminDash] Attempting to mark order ${orderId} as Completed...`);
            // apiClient automatically adds the token
            const apiUrl = `/orders/admin/${orderId}/status`;
            const response = await apiClient.put<AdminOrderDocument>(apiUrl, { status: 'Completed' }); // Send status in body

            console.log(`[AdminDash] Mark Complete Response Status for ${orderId}:`, response.status);
            const updatedOrder = response.data;
            console.log(`[AdminDash] Order ${orderId} successfully marked complete. Response:`, updatedOrder);

            // Update local state immediately
            // Remove from list if filter is 'Processing', otherwise update status
             if (filterStatus === 'Processing') {
                 setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
                 toast.success(`Order removed from 'Processing' list.`);
            } else {
                setOrders(prevOrders =>
                    prevOrders.map(order =>
                        order._id === orderId ? { ...order, status: 'Completed', updatedAt: new Date().toISOString() } : order
                    )
                );
                 toast.success(`Order status updated to 'Completed'.`);
            }

        } catch (err: any) {
             console.error(`[AdminDash] Error marking order ${orderId} complete:`, err);
             const message = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Update failed";
             toast.error(`Update failed: ${message}`);
        } finally {
             setUpdatingOrderId(null);
        }
    }, [currentUser, isAdminUser, updatingOrderId, filterStatus]);


    // --- Render Logic ---

    // Initial Loading (Auth + App User)
    if (authLoading || loadingAppUser) {
         return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                 <span className="ml-4 text-muted-foreground">Loading Admin Session...</span>
            </div>
        );
    }

    // Not Authenticated or Not Admin (after loading checks)
     if (!currentUser || !isAdminUser) {
        // The useEffect should have already redirected, but this is a fallback UI
         return (
            <div className="container mx-auto px-4 py-8 text-center">
                 <div className="bg-destructive/10 text-destructive p-6 rounded-md border border-destructive/30 flex flex-col items-center gap-4 max-w-md mx-auto">
                    <ShieldAlert className="h-12 w-12" />
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p>You do not have permission to view this page.</p>
                    <Button onClick={() => navigate('/dashboard')} variant="secondary">Go to Dashboard</Button>
                </div>
            </div>
         );
     }


    // Main Admin View (Authenticated and Admin)
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard - Order Management</h1>

            {/* Filter and Refresh Controls */}
             <div className="mb-6 flex flex-wrap items-center gap-4">
                <div className='flex items-center gap-2'>
                    <label htmlFor="statusFilter" className="font-medium text-sm shrink-0">Filter by Status:</label>
                    <select
                        id="statusFilter"
                        value={filterStatus}
                        // Refetch orders when filter changes
                        onChange={(e) => {
                            setFilterStatus(e.target.value as AdminOrderDocument['status']);
                            // Trigger refetch (useCallback ensures function identity is stable)
                            // No need to call fetchOrders() here if it's in the dependency array
                            // of a useEffect hook tied to filterStatus (as added above)
                            // Let's keep it explicit for now for clarity:
                             fetchOrders();
                         }}
                        className="p-2 border rounded-md bg-card text-card-foreground focus:ring-primary text-sm"
                        disabled={isLoading}
                    >
                        {STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
                <Button onClick={fetchOrders} disabled={isLoading} size="sm" variant="outline">
                    {isLoading && updatingOrderId === null ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4"/>}
                    <span className="ml-2">Refresh List</span>
                </Button>
            </div>

            {/* Error Display Area */}
            {error && !isLoading && ( // Show error only when not loading
                <div className="my-4 bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/30 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <p><strong>Error loading orders:</strong> {error}</p>
                </div>
            )}

            {/* Orders Table Area */}
            <div className="bg-card border border-border rounded-lg shadow overflow-hidden">
                {isLoading ? ( // Show loading indicator covering table area
                     <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin"/> Loading orders...
                    </div>
                ) : orders.length === 0 && !error ? ( // Show no orders message
                     <p className="text-center text-muted-foreground p-8">No orders found with status '{filterStatus}'.</p>
                ) : orders.length > 0 ? ( // Render table if orders exist
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                           {/* ... Keep the existing thead and tbody structure ... */}
                            <thead className="bg-muted/50 dark:bg-muted/20">
                                <tr>
                                    {/* Table Headers */}
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Link</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-border">
                                {orders.map((order) => (
                                    <tr key={order._id} className="hover:bg-muted/50 dark:hover:bg-muted/20">
                                        {/* Date */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                        {/* User */}
                                         <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground" title={order.userId?.email ?? 'N/A'}>
                                            {order.userId?.username || order.userId?.name || order.userId?.email || 'N/A'}
                                         </td>
                                        {/* Service */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                                            {order.platform} / {order.service} ({order.quality})
                                        </td>
                                        {/* Link */}
                                         <td className="px-4 py-3 text-sm text-foreground truncate max-w-xs" title={order.accountLink}>
                                            <a href={order.accountLink.startsWith('http') ? order.accountLink : `https://${order.accountLink}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline hover:text-blue-400">
                                                {order.accountLink} <ExternalLink className="inline h-3 w-3 ml-1 opacity-70"/>
                                             </a>
                                        </td>
                                        {/* Qty */}
                                         <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground text-center">{order.quantity}</td>
                                         {/* Amount */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground text-right">Ksh {order.amount.toFixed(2)}</td>
                                        {/* Status */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                order.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                order.status === 'Processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                                                order.status === 'Pending Payment' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                order.status === 'Cancelled' || order.status === 'Expired' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                                'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                            {order.status === 'Processing' && (
                                                <Button
                                                    size="sm" variant="outline"
                                                    onClick={() => handleMarkComplete(order._id)}
                                                    disabled={updatingOrderId === order._id || isLoading} // Disable during general load too
                                                    className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/50 dark:hover:text-green-300"
                                                >
                                                    {updatingOrderId === order._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" /> }
                                                    <span className="ml-1">Complete</span>
                                                </Button>
                                            )}
                                            {/* Add Link for details page here if needed */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 ) : null }
             </div>
             {/* TODO: Add Pagination UI controls */}
        </div>
    );
}