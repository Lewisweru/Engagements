// --- START OF FILE Engagements/src/pages/PaymentCallbackPage.tsx --- (Retry 401 Logic)

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { apiClient } from '@/contexts/AuthContext';

// Types (keep as before)
type OrderStatus = 'Pending Payment' | 'Payment Failed' | 'Processing' | 'Completed' | 'Cancelled' | 'Unknown' | 'Expired' | 'Supplier Error';
type PageDisplayStatus = 'loading' | 'success' | 'failed' | 'pending' | 'unknown' | 'auth_required';
interface BackendStatusResponse { status: OrderStatus; paymentStatus: string | null; orderId: string; supplierStatus?: string; }


export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantReference = searchParams.get("OrderMerchantReference");

  const [displayStatus, setDisplayStatus] = useState<PageDisplayStatus>("loading");
  const [message, setMessage] = useState<string>("Verifying payment status...");

  // Refs for polling and retrying auth
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef<number>(0);
  const authRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for auth retry timer

  const MAX_POLL_ATTEMPTS = 5;
  const POLL_INTERVAL_MS = 5000;
  const AUTH_RETRY_DELAY_MS = 2000; // Delay before retrying fetch after 401

  // Clear all timers function
  const clearAllTimers = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (authRetryTimeoutRef.current) clearTimeout(authRetryTimeoutRef.current);
      pollIntervalRef.current = null;
      authRetryTimeoutRef.current = null;
      pollAttemptsRef.current = 0; // Reset poll attempts too
  }

  // Fetch Function
  const fetchOrderStatusFromBackend = useCallback(async (isPolling = false, isAuthRetry = false) => {
    if (!merchantReference) return;

    // Only set loading on initial fetch or auth retry, not during normal polling
    if (!isPolling || isAuthRetry) {
         setDisplayStatus('loading');
    }
    setMessage(_prev => isPolling ? `Checking status again... (Attempt ${pollAttemptsRef.current + 1})` : "Verifying payment status...");
    console.log(`[Callback] ${isPolling ? 'Polling' : (isAuthRetry ? 'Retrying Fetch' : 'Fetching')} status for MerchantRef: ${merchantReference}`);

    try {
        const apiUrl = `/orders/status-by-ref/${merchantReference}`;
        const response = await apiClient.get<BackendStatusResponse>(apiUrl);
        const data = response.data;
        console.log("[Callback] Backend status data received:", data);

        // Clear any pending auth retry timer if request succeeds
        if (authRetryTimeoutRef.current) clearTimeout(authRetryTimeoutRef.current);
        authRetryTimeoutRef.current = null;

        let nextDisplayStatus: PageDisplayStatus = "unknown";
        let nextMessage = "";

        switch (data.status) {
            case 'Processing':
            case 'Completed':
              nextDisplayStatus = "success";
              nextMessage = `Payment successful! Your order ${data.orderId ? `(${data.orderId})` : ''} is ${data.status.toLowerCase()}.`;
              if (!isPolling) toast.success("Payment verified!");
              clearAllTimers(); // Stop polling on final success
              break;
            case 'Payment Failed':
            case 'Cancelled':
            case 'Expired':
              nextDisplayStatus = "failed";
              nextMessage = `Payment ${data.status.toLowerCase()} ${data.paymentStatus ? `(${data.paymentStatus})` : ''}. Please try again or contact support.`;
              if (!isPolling) toast.error("Payment verification indicated failure.");
              clearAllTimers(); // Stop polling on final failure
              break;
            case 'Pending Payment':
            default:
              if (isPolling || isAuthRetry) { // Only increment poll count if polling or retrying
                   pollAttemptsRef.current += 1;
                   console.log(`[Callback] Status still '${data.status}'. Poll attempt ${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS}.`);
                   if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
                       console.log("[Callback] Max poll attempts reached.");
                       nextDisplayStatus = "pending";
                       nextMessage = 'Verification is taking longer than expected. Please check your dashboard shortly.';
                       toast("Verification is taking time. Check dashboard soon.", { icon: '⏳' });
                       clearAllTimers(); // Stop polling
                   } else {
                       nextDisplayStatus = "loading"; // Keep loading during poll
                       // Schedule next poll if not already scheduled by initial fetch
                       if (!pollIntervalRef.current && !isAuthRetry) { // Avoid double intervals
                            pollIntervalRef.current = setInterval(() => fetchOrderStatusFromBackend(true), POLL_INTERVAL_MS);
                       }
                   }
              } else {
                  // Initial fetch returned Pending, start polling
                  console.log(`[Callback] Initial status is '${data.status}'. Starting polling...`);
                  nextDisplayStatus = "loading";
                  nextMessage = "Waiting for final confirmation...";
                  pollAttemptsRef.current = 1; // Start counting attempts
                  if (!pollIntervalRef.current) { // Prevent multiple intervals
                      pollIntervalRef.current = setInterval(() => fetchOrderStatusFromBackend(true), POLL_INTERVAL_MS);
                  }
              }
              break;
        }
        setDisplayStatus(nextDisplayStatus);
        setMessage(nextMessage);

    } catch (error: any) {
        console.error("[Callback] Error in fetchOrderStatusFromBackend:", error);
        // Specific handling for 401 Unauthorized
        if (error.response?.status === 401 && !isAuthRetry) {
             console.warn("[Callback] Received 401 Unauthorized. Will retry once after delay.");
             setMessage("Authentication session initializing... Retrying check shortly.");
             setDisplayStatus("loading"); // Keep loading visually
             // Clear existing timers before setting a new one
             clearAllTimers();
             // Schedule a single retry after a delay
             authRetryTimeoutRef.current = setTimeout(() => {
                 fetchOrderStatusFromBackend(false, true); // Call again, mark as auth retry
             }, AUTH_RETRY_DELAY_MS);
             // Don't set final error state yet, wait for retry
             return; // Exit function early, wait for retry
        }

        // Handle other errors or 401 on retry
        let errorMessage = "An unknown error occurred";
        if (error.response?.status === 401) { // Handle 401 on the *retry* attempt
            errorMessage = "Authorization failed. Please ensure you are logged in.";
            setDisplayStatus("auth_required");
            toast.error("Login required to check payment status.");
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

        setMessage(`Error verifying payment status: ${errorMessage}`);
        if(error.response?.status !== 401) { // Avoid double toast if 401 handled above
            toast.error("Could not verify payment status.");
        }
        clearAllTimers(); // Stop polling on error
    }
  }, [merchantReference, orderTrackingId]);


  // Effect to run the initial fetch
  useEffect(() => {
    console.log(`[Callback Effect] Running. Auth Loading: ${authLoading}, User: ${currentUser ? currentUser.uid : 'null'}, Ref: ${merchantReference}`);
    if (!merchantReference) { /* ... handle missing ref ... */
         setDisplayStatus("failed");
         setMessage("Could not verify payment: Invalid callback URL.");
         return;
    }
    if (authLoading) { /* ... handle auth loading ... */
         setMessage("Initializing session...");
         setDisplayStatus("loading");
         return;
    }
    // No need for !currentUser check here, fetch will handle 401 and retry/fail

    // Proceed to fetch initial status
    const initialTimerId = setTimeout(() => {
        console.log("[Callback Effect] Auth loaded. Fetching initial status...");
        fetchOrderStatusFromBackend(false); // Initial fetch
    }, 300);

    // Cleanup function clears ALL timers
    return () => {
        clearTimeout(initialTimerId);
        clearAllTimers();
    };
  // Only depend on these - currentUser change doesn't need to re-trigger initial fetch directly
  }, [authLoading, fetchOrderStatusFromBackend, merchantReference]);


  // Render Content Function (Add 'auth_required' case)
  const renderContent = (): React.ReactNode => {
    switch (displayStatus) {
        // ... cases for loading, pending, success, failed, unknown (keep as before) ...
        case 'loading': return (<> <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" /> <h1 className="text-2xl font-semibold mt-6">Verifying Payment...</h1> <p className="text-muted-foreground mt-2">{message}</p> </>);
        case 'pending': return (<> <motion.div><AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" /></motion.div> <h1 className="text-3xl font-bold mt-6 text-yellow-500">Verification Pending</h1> <p className="text-muted-foreground mt-2 mb-6">{message}</p> <Link to="/dashboard"><Button size="lg" variant="outline">Check Dashboard</Button></Link> </>);
        case 'success': return (<> <motion.div><CheckCircle className="w-16 h-16 text-green-500 mx-auto" /></motion.div> <h1 className="text-3xl font-bold mt-6 text-green-500">Payment Successful!</h1> <p className="text-muted-foreground mt-2 mb-6">{message}</p> <Link to="/dashboard"><Button size="lg" className="bg-green-600 hover:bg-green-700">Go to Dashboard</Button></Link> </>);
        case 'failed': return (<> <motion.div><XCircle className="w-16 h-16 text-red-500 mx-auto" /></motion.div> <h1 className="text-3xl font-bold mt-6 text-red-500">Payment Failed/Cancelled</h1> <p className="text-muted-foreground mt-2 mb-6">{message}</p> <Link to="/engagement"><Button size="lg" variant="destructive" className="bg-red-600 hover:bg-red-700">Try Again</Button></Link> </>);
        case 'auth_required': // Handle specific auth error state
            return (
            <>
                <motion.div><AlertTriangle className="w-16 h-16 text-orange-500 mx-auto" /></motion.div>
                <h1 className="text-3xl font-bold mt-6 text-orange-500">Authentication Required</h1>
                <p className="text-muted-foreground mt-2 mb-6">{message}</p>
                <Button size="lg" variant="default" onClick={() => navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))}>
                    Log In to Check Status
                </Button>
            </>
            );
        case 'unknown':
        default: return (<> <motion.div><AlertTriangle className="w-16 h-16 text-orange-500 mx-auto" /></motion.div> <h1 className="text-3xl font-bold mt-6 text-orange-500">Status Check Error</h1> <p className="text-muted-foreground mt-2 mb-6">{message}</p> <Link to="/dashboard"><Button size="lg" variant="outline">Check Dashboard</Button></Link> </>);
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