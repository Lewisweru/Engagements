import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom'; // Keep Link
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext'; // Keep useAuth
import { Button } from "@/components/ui/button"; // Keep Button

// Define status types matching your backend Order schema + UI states
type OrderStatus = 'Pending Payment' | 'Payment Failed' | 'Processing' | 'Completed' | 'Cancelled' | 'Unknown';
type PageDisplayStatus = 'loading' | 'success' | 'failed' | 'pending' | 'unknown';

// Define the expected structure of the successful data from your backend status endpoint
interface BackendStatusResponse {
    status: OrderStatus;
    paymentStatus: string | null;
    orderId: string; // Keep this if you might display it later
    // Add other fields if your backend returns more
}

// Define the structure for potential error responses from fetch
interface FetchErrorResponse {
    message?: string;
    // Add other potential error fields
}

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  // Get parameters from URL query string
  // Prefix orderTrackingId with '_' since it's only used for logging now
  const _orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantReference = searchParams.get("OrderMerchantReference"); // Our pesapalOrderId

  // State for managing the UI display with explicit types
  const [displayStatus, setDisplayStatus] = useState<PageDisplayStatus>("loading");
  const [message, setMessage] = useState<string>("Verifying payment status...");
  // Keep internalOrderId state if you might need it later, otherwise remove it and the setInternalOrderId call below
  const [_internalOrderId, setInternalOrderId] = useState<string | null>(null);

  // --- Polling Logic ---
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null); // Explicitly type interval ID or null
  const pollAttemptsRef = useRef<number>(0);
  const MAX_POLL_ATTEMPTS = 5; // How many times to check status
  const POLL_INTERVAL_MS = 4000; // Check every 4 seconds
  // --- End Polling Logic ---

  // Use useCallback to memoize the fetch function
  const fetchOrderStatusFromBackend = useCallback(async (isPolling = false) => {
    if (!merchantReference) {
        if (!isPolling) {
             console.error("Payment callback error: Missing OrderMerchantReference.");
             toast.error("Invalid payment callback URL.");
             setMessage("Could not verify payment: Invalid callback URL.");
             setDisplayStatus("failed");
             if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
        return;
    }

    if(!isPolling) {
        setDisplayStatus("loading");
        setMessage("Verifying payment status...");
    }
    console.log(`[Callback] ${isPolling ? 'Polling' : 'Fetching'} status for MerchantRef: ${merchantReference}, TrackingId: ${_orderTrackingId}`); // Log the unused prefixed var

    try {
      let token: string | null = null; // Explicit type for token
      if (currentUser) {
        try { token = await currentUser.getIdToken(); }
        catch (tokenError) { console.error("Callback: Error getting token", tokenError); }
      }

      const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api/orders/status-by-ref/${merchantReference}`;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) { headers['Authorization'] = `Bearer ${token}`; }

      const response = await fetch(apiUrl, { method: 'GET', headers: headers });
      console.log("[Callback] Backend status response code:", response.status);

      if (!response.ok) {
        const errorData: FetchErrorResponse = await response.json().catch(() => ({ message: `Request failed (${response.status})` }));
        throw new Error(errorData.message || `Failed to fetch status`);
      }

      const data: BackendStatusResponse = await response.json();
      console.log("[Callback] Backend status data received:", data);
      setInternalOrderId(data.orderId); // Set the state (warning resolved if internalOrderId is used later)

      let currentDisplayStatus: PageDisplayStatus = displayStatus;

      switch (data.status) {
        case 'Processing':
        case 'Completed':
          currentDisplayStatus = "success";
          setMessage('Payment successful! Your order is being processed.');
          if (!isPolling) toast.success("Payment verified!");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          break;
        case 'Payment Failed':
        case 'Cancelled':
          currentDisplayStatus = "failed";
          setMessage(`Payment ${data.paymentStatus?.toLowerCase() || 'failed/cancelled'}.`);
          if (!isPolling) toast.error("Payment verification indicated failure.");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          break;
        case 'Pending Payment':
        default:
          if (isPolling) {
               pollAttemptsRef.current += 1;
               console.log(`[Callback] Status still '${data.status}'. Poll attempt ${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS}.`);
               if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
                   console.log("[Callback] Max poll attempts reached.");
                   currentDisplayStatus = "pending";
                   setMessage('Payment verification is taking longer than expected. Please check your dashboard shortly.');
                   if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
               } else {
                   currentDisplayStatus = "loading";
                   setMessage("Waiting for final confirmation...");
               }
          } else {
              console.log("[Callback] Initial status is Pending Payment. Starting polling...");
              currentDisplayStatus = "loading";
              setMessage("Waiting for final confirmation...");
              pollAttemptsRef.current = 1;
              if (!pollIntervalRef.current) {
                  pollIntervalRef.current = setInterval(() => fetchOrderStatusFromBackend(true), POLL_INTERVAL_MS);
              }
          }
          break;
      }
       if (displayStatus !== currentDisplayStatus || displayStatus === 'loading') {
           setDisplayStatus(currentDisplayStatus);
       }

    } catch (error: unknown) {
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === 'string') errorMessage = error;
        console.error("Error in fetchOrderStatusFromBackend:", errorMessage);
        setMessage(`Error verifying payment status: ${errorMessage}`);
        if (!isPolling) toast.error("Could not verify payment status.");
        setDisplayStatus("unknown");
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  // Add _orderTrackingId to dependency array because it's used in console.log inside
  }, [merchantReference, currentUser, displayStatus, _orderTrackingId]);


  // Effect to run the initial fetch (after a delay)
  useEffect(() => {
    if (!merchantReference) return;
    const initialTimerId = setTimeout(() => { fetchOrderStatusFromBackend(false); }, 1500);
    return () => {
        clearTimeout(initialTimerId);
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        pollAttemptsRef.current = 0;
    };
  }, [fetchOrderStatusFromBackend, merchantReference]); // fetchOrderStatusFromBackend is memoized


  // --- Render Content Function ---
  const renderContent = (): React.ReactNode => {
    switch (displayStatus) {
      case 'loading':
      case 'pending':
        return (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mt-6">
              {displayStatus === 'loading' ? 'Verifying Payment...' : 'Verification Pending...'}
            </h1>
            <p className="text-muted-foreground mt-2">{message}</p>
            {/* Optional: Display internalOrderId if needed for user reference */}
            {/* {internalOrderId && displayStatus === 'pending' && <p className='text-xs mt-4 text-muted-foreground'>Order Ref: {internalOrderId}</p>} */}
          </>
        );
      case 'success':
        return (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-green-500">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
            {/* Optional: Display internalOrderId */}
            {/* {internalOrderId && <p className='text-xs mb-4 text-muted-foreground'>Order Ref: {internalOrderId}</p>} */}
            <Link to="/dashboard">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">Go to Dashboard</Button>
            </Link>
          </>
        );
      case 'failed':
        return (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-red-500">Payment Failed</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
             {/* Optional: Display internalOrderId */}
            {/* {internalOrderId && <p className='text-xs mb-4 text-muted-foreground'>Order Ref: {internalOrderId}</p>} */}
            <Link to="/engagement">
              <Button size="lg" variant="destructive" className="bg-red-600 hover:bg-red-700">
                Try Again
              </Button>
            </Link>
          </>
        );
      case 'unknown':
      default:
        return (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                 <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-yellow-500">Status Check Error</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
             {/* Optional: Display internalOrderId */}
            {/* {internalOrderId && <p className='text-xs mb-4 text-muted-foreground'>Order Ref: {internalOrderId}</p>} */}
            <Link to="/dashboard">
              <Button size="lg" variant="outline">Check Dashboard</Button>
            </Link>
          </>
        );
    }
  };
  // --- End renderContent function ---


  // --- Main Component Return ---
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