// --- START OF FILE Engagements/src/pages/PaymentCallbackPage.tsx --- (Corrected useEffect for Auth Check)

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { apiClient } from '@/contexts/AuthContext'; // Import apiClient

// Types
type OrderStatus = 'Pending Payment' | 'Payment Failed' | 'Processing' | 'Completed' | 'Cancelled' | 'Unknown' | 'Expired' | 'Supplier Error';
type PageDisplayStatus = 'loading' | 'success' | 'failed' | 'pending' | 'unknown' | 'auth_required'; // Added auth_required state
interface BackendStatusResponse {
    status: OrderStatus;
    paymentStatus: string | null;
    orderId: string;
    supplierStatus?: string; // Optional supplier status
}


export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  // Get currentUser and authLoading state from useAuth
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate(); // For potential redirection

  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantReference = searchParams.get("OrderMerchantReference");

  const [displayStatus, setDisplayStatus] = useState<PageDisplayStatus>("loading");
  const [message, setMessage] = useState<string>("Verifying payment status...");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef<number>(0);
  const MAX_POLL_ATTEMPTS = 5; // Keep polling attempts reasonable
  const POLL_INTERVAL_MS = 5000; // Slightly longer poll interval

  // Fetch Function (Uses apiClient implicitly handling auth)
  const fetchOrderStatusFromBackend = useCallback(async (isPolling = false) => {
    // Guard against missing reference (should be caught by useEffect, but defensive check)
    if (!merchantReference) return;

    // Update UI state for loading/polling
    setDisplayStatus('loading');
    setMessage(prev => isPolling ? `Checking status again... (Attempt ${pollAttemptsRef.current + 1})` : "Verifying payment status...");
    console.log(`[Callback] ${isPolling ? 'Polling' : 'Fetching'} status for MerchantRef: ${merchantReference}, TrackingId: ${orderTrackingId}`);

    try {
        // apiClient includes the token *if* currentUser is available in context when the request is made
        const apiUrl = `/orders/status-by-ref/${merchantReference}`;
        const response = await apiClient.get<BackendStatusResponse>(apiUrl);

      console.log("[Callback] Backend status response code:", response.status);
      const data = response.data;
      console.log("[Callback] Backend status data received:", data);

      let nextDisplayStatus: PageDisplayStatus = "unknown";
      let nextMessage = "";

      switch (data.status) {
        case 'Processing':
        case 'Completed':
          nextDisplayStatus = "success";
          nextMessage = `Payment successful! Your order ${data.orderId ? `(${data.orderId})` : ''} is ${data.status.toLowerCase()}.`;
          if (!isPolling) toast.success("Payment verified!");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          break;
        case 'Payment Failed':
        case 'Cancelled':
        case 'Expired':
          nextDisplayStatus = "failed";
          nextMessage = `Payment ${data.status.toLowerCase()} ${data.paymentStatus ? `(${data.paymentStatus})` : ''}. Please try again or contact support.`;
          if (!isPolling) toast.error("Payment verification indicated failure.");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          break;
        case 'Pending Payment':
        default: // Includes 'Unknown', potentially 'Supplier Error' if not final
          if (isPolling) {
               pollAttemptsRef.current += 1;
               console.log(`[Callback] Status still '${data.status}'. Poll attempt ${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS}.`);
               if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
                   console.log("[Callback] Max poll attempts reached.");
                   nextDisplayStatus = "pending";
                   nextMessage = 'Payment verification is taking longer than expected. Please check your dashboard shortly or contact support if issues persist.';
                   toast("Verification is taking time. Check your dashboard soon.", { icon: '⏳' });
                   if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
               } else {
                   nextDisplayStatus = "loading"; // Keep loading during poll
               }
          } else {
              console.log(`[Callback] Initial status is '${data.status}'. Starting polling...`);
              nextDisplayStatus = "loading";
              nextMessage = "Waiting for final confirmation...";
              pollAttemptsRef.current = 1;
              if (!pollIntervalRef.current) {
                  pollIntervalRef.current = setInterval(() => fetchOrderStatusFromBackend(true), POLL_INTERVAL_MS);
              }
          }
          break;
      }

      // Update state
      setDisplayStatus(nextDisplayStatus);
      setMessage(nextMessage);

    } catch (error: any) {
        let errorMessage = "An unknown error occurred";
        // Check for specific 401 error from backend
        if (error.response?.status === 401) {
            errorMessage = error.response.data?.message || "Authorization failed. Please ensure you are logged in.";
            setDisplayStatus("auth_required"); // Set specific status for auth failure
            toast.error("Login required to check payment status.");
            // Optional: Redirect after a delay
            // setTimeout(() => navigate('/auth?redirect=/payment-callback' + window.location.search), 3000);
        } else if (error.response?.data?.error?.message) {
             errorMessage = error.response.data.error.message;
             setDisplayStatus("unknown");
        } else if (error.response?.data?.message) {
             errorMessage = error.response.data.message;
             setDisplayStatus("unknown");
        } else if (error.message) {
             errorMessage = error.message;
             setDisplayStatus("unknown");
        }

        console.error("[Callback] Error in fetchOrderStatusFromBackend:", error);
        setMessage(`Error verifying payment status: ${errorMessage}`);
        // Avoid double toast if already handled by 401
        if(error.response?.status !== 401 && !isPolling) {
            toast.error("Could not verify payment status.");
        }
        // Keep displayStatus as set above (auth_required or unknown)
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [merchantReference, orderTrackingId]); // navigate dependency removed as it's stable


  // Effect to run the initial fetch, now depends on auth state
  useEffect(() => {
    console.log(`[Callback Effect] Running. Auth Loading: ${authLoading}, User: ${currentUser ? currentUser.uid : 'null'}, Ref: ${merchantReference}`);
    // 1. Handle missing reference immediately
    if (!merchantReference) {
        console.log("[Callback Effect] No merchant reference, setting failed state.");
        setDisplayStatus("failed");
        setMessage("Could not verify payment: Invalid callback URL (missing reference).")
        return; // Exit early
    }

    // 2. Wait if auth is still loading
    if (authLoading) {
        console.log("[Callback Effect] Waiting for auth state...");
        setMessage("Initializing session...");
        setDisplayStatus("loading");
        return; // Don't proceed yet
    }

    // 3. Handle case where auth is loaded, but user is NOT logged in
    if (!currentUser) {
        console.log("[Callback Effect] No user session found after auth check.");
        setMessage("Authentication required to check status. Please log in.");
        setDisplayStatus("auth_required"); // Use specific status
        toast.error("Login required to verify payment.");
        // Optionally redirect to login, passing current search params
        // const currentSearchParams = new URLSearchParams(window.location.search).toString();
        // setTimeout(() => navigate(`/auth?redirect=/payment-callback?${currentSearchParams}`), 3000);
        return;
    }

    // 4. Proceed: Auth loaded, user exists, merchantRef exists
    // Delay the first fetch slightly to ensure context/state propagation (optional)
    const initialTimerId = setTimeout(() => {
        console.log("[Callback Effect] Auth loaded, user present. Fetching initial status...");
        fetchOrderStatusFromBackend(false);
    }, 300); // Short delay

    // Cleanup function
    return () => {
        clearTimeout(initialTimerId);
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        pollAttemptsRef.current = 0;
    };
  // Add authLoading and currentUser as dependencies
  }, [authLoading, currentUser, fetchOrderStatusFromBackend, merchantReference, navigate]);


  // Render Content Function
  const renderContent = (): React.ReactNode => {
    switch (displayStatus) {
      case 'loading':
        return ( /* ... same as before ... */
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mt-6">Verifying Payment...</h1>
            <p className="text-muted-foreground mt-2">{message}</p>
          </>
        );
      case 'pending':
        return ( /* ... same as before ... */
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                 <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-yellow-500">Verification Pending</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
            <Link to="/dashboard"><Button size="lg" variant="outline">Check Dashboard</Button></Link>
          </>
        );
      case 'success':
        return ( /* ... same as before ... */
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-green-500">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
            <Link to="/dashboard">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">Go to Dashboard</Button>
            </Link>
          </>
        );
      case 'failed':
        return ( /* ... same as before ... */
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-red-500">Payment Failed/Cancelled</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
            <Link to="/engagement">
              <Button size="lg" variant="destructive" className="bg-red-600 hover:bg-red-700">
                Try Again
              </Button>
            </Link>
          </>
        );
      // Added state for auth required
      case 'auth_required':
        return (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                 <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-orange-500">Authentication Required</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
            <Button size="lg" variant="default" onClick={() => navigate('/auth?redirect=/payment-callback' + window.location.search)}>
                Log In
            </Button>
          </>
        );
      case 'unknown': // State for generic fetch errors
      default:
        return ( /* ... same as before ... */
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                 <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-orange-500">Status Check Error</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
            <Link to="/dashboard">
              <Button size="lg" variant="outline">Check Dashboard</Button>
            </Link>
          </>
        );
    }
  };


  // Main Component Return
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full bg-background/80 dark:bg-gray-900/80 backdrop-blur-md rounded-lg shadow-lg p-8 text-center border border-border"
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}

// --- END OF FILE Engagements/src/pages/PaymentCallbackPage.tsx ---