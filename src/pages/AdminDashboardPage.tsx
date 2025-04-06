// src/pages/AdminDashboardPage.tsx
import { useState, useEffect, useCallback } from 'react'; // Removed React import, kept hooks
import { useAuth } from '@/contexts/AuthContext'; // For getting token and user info
import { Button } from "@/components/ui/button"; // For UI elements
import { Loader2, Check, RefreshCw, AlertCircle, ExternalLink } from "lucide-react"; // Icons
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom'; // For redirecting & future links, REMOVED Link for now

// Interface matching backend Order structure received from the admin endpoint
// Note: Includes populated userId details
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

// Interface for the paginated response from backend
interface PaginatedOrdersResponse {
    orders: AdminOrderDocument[];
    page: number;
    pages: number;
    total: number;
}

// Define the possible statuses for filtering
const STATUS_OPTIONS: AdminOrderDocument['status'][] = [
    'Processing',
    'Pending Payment',
    'Completed',
    'Payment Failed',
    'Cancelled',
    'Expired', // Add if using cleanup job
    'Supplier Error' // Add if using automation
];


export default function AdminDashboardPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // State for orders, loading, errors, filters, and pagination
    const [orders, setOrders] = useState<AdminOrderDocument[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<AdminOrderDocument['status']>('Processing'); // Default filter
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null); // Track which order update is in progress

    // TODO: Add state for pagination if implementing UI controls
    // const [currentPage, setCurrentPage] = useState(1);
    // const [totalPages, setTotalPages] = useState(1);
    // const [totalOrders, setTotalOrders] = useState(0);

    // Authorization Check (Client-side guard - supplements backend protection)
    useEffect(() => {
        // Wait for auth loading to finish
        if (!authLoading) {
            if (!currentUser) {
                toast.error("Please log in to access this page.");
                navigate('/auth'); // Redirect to login if not logged in
            }
            // IMPORTANT: Add frontend role check here if possible later
        }
    }, [currentUser, authLoading, navigate]);

    // Fetch orders based on filter (memoized with useCallback)
    const fetchOrders = useCallback(async () => {
        if (authLoading || !currentUser) return;

        setIsLoading(true);
        setError(null);
        console.log(`Fetching admin orders with status: ${filterStatus}`);

        try {
            const token = await currentUser.getIdToken();
            const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api/orders/admin/all?status=${filterStatus}`;
            console.log("Calling Admin API:", apiUrl);

            const response = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            console.log("Admin API Response Status:", response.status);

            if (!response.ok) {
                let errorMessage = `Failed to fetch orders (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                     if (response.status === 403) {
                        errorMessage = "Access Forbidden: Admin privileges required.";
                        navigate('/dashboard'); // Redirect non-admins away
                    }
                } catch (e) { /* Ignore JSON parsing error */ }
                throw new Error(errorMessage);
            }

            const data: PaginatedOrdersResponse = await response.json();
            console.log("Admin Orders Received:", data);
            setOrders(data.orders || []);
            // Update pagination state here if needed

        } catch (err: unknown) {
            console.error("Error fetching admin orders:", err);
            const message = err instanceof Error ? err.message : "An unknown error occurred";
            setError(message);
            toast.error(`Error loading orders: ${message}`);
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, authLoading, filterStatus, navigate]); // Dependencies updated

    // Effect to fetch orders on initial mount and when fetchOrders changes
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);


    // Handler to mark an order as completed
    const handleMarkComplete = useCallback(async (orderId: string) => {
        if (!currentUser || updatingOrderId === orderId) return;

        setUpdatingOrderId(orderId);
        // Removed originalOrders as it wasn't used for rollback

        try {
            console.log(`Attempting to mark order ${orderId} as Completed...`);
            const token = await currentUser.getIdToken();
            const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api/orders/admin/${orderId}/status`;
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'Completed' }),
            });

            console.log(`Mark Complete Response Status for ${orderId}:`, response.status);

            if (!response.ok) {
                 let errorMessage = `Failed to update status (${response.status})`;
                 try { const errorData = await response.json(); errorMessage = errorData.message || errorMessage; } catch(e) {}
                 throw new Error(errorMessage);
            }

            const updatedOrder: AdminOrderDocument = await response.json();
            console.log(`Order ${orderId} successfully marked complete. Response:`, updatedOrder);

            // Update local state immediately
            if (filterStatus === 'Processing') {
                 setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
            } else {
                setOrders(prevOrders =>
                    prevOrders.map(order =>
                        order._id === orderId ? { ...order, status: 'Completed', updatedAt: new Date().toISOString() } : order
                    )
                );
            }
             toast.success(`Order marked completed!`);

        } catch (err: unknown) {
             console.error(`Error marking order ${orderId} complete:`, err);
             const message = err instanceof Error ? err.message : "Update failed";
             toast.error(`Update failed: ${message}`);
             // No UI rollback implemented here, relies on next fetch or manual refresh
        } finally {
             setUpdatingOrderId(null);
        }
    // Ensure filterStatus is included as it affects the optimistic update
    }, [currentUser, updatingOrderId, filterStatus]);


    // --- Render Logic ---
    if (isLoading && orders.length === 0 && !error) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

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
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as AdminOrderDocument['status'])}
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
            {error && (
                <div className="my-4 bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/30 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <p><strong>Error loading orders:</strong> {error}</p>
                </div>
            )}

            {/* Orders Table Area */}
            <div className="bg-card border border-border rounded-lg shadow overflow-hidden">
                {isLoading && orders.length > 0 && (
                     <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2"/> Refreshing...</div>
                )}
                {!isLoading && orders.length === 0 && !error && (
                     <p className="text-center text-muted-foreground p-8">No orders found with status '{filterStatus}'.</p>
                )}
                {orders.length > 0 && (
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
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
                                        {/* Table Data Cells */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground" title={order.userId?.email ?? 'N/A'}>{order.userId?.username || order.userId?.name || order.userId?.email || 'N/A'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{order.platform} / {order.service} ({order.quality})</td>
                                        <td className="px-4 py-3 text-sm text-foreground truncate max-w-xs" title={order.accountLink}>
                                            <a href={order.accountLink.startsWith('http') ? order.accountLink : `https://${order.accountLink}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline hover:text-blue-400">
                                                {order.accountLink} <ExternalLink className="inline h-3 w-3 ml-1 opacity-70"/>
                                             </a>
                                        </td>
                                         <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground text-center">{order.quantity}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground text-right">Ksh {order.amount.toFixed(2)}</td>
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
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                            {order.status === 'Processing' && (
                                                <Button
                                                    size="sm" variant="outline"
                                                    onClick={() => handleMarkComplete(order._id)}
                                                    disabled={updatingOrderId === order._id}
                                                    className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/50 dark:hover:text-green-300"
                                                >
                                                    {updatingOrderId === order._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" /> }
                                                    <span className="ml-1">Complete</span>
                                                </Button>
                                            )}
                                            {/* Add Link for details page here if needed */}
                                            {/* <Link to={`/admin/order/${order._id}`} className="ml-2"><Button size="sm" variant="ghost">Details</Button></Link> */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 )}
             </div>
             {/* TODO: Add Pagination UI controls */}
        </div>
    );
}