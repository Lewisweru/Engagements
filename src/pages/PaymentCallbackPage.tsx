// src/pages/PaymentCallbackPage.tsx (TypeScript Version - Fixed Loop & Unused Vars)

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";

// Define types
type OrderStatus = 'Pending Payment' | 'Payment Failed' | 'Processing' | 'Completed' | 'Cancelled' | 'Unknown';
type PageDisplayStatus = 'loading' | 'success' | 'failed' | 'pending' | 'unknown';
interface BackendStatusResponse {
    status: OrderStatus;
    paymentStatus: string | null;
    orderId: string;
}
interface FetchErrorResponse {
    message?: string;
}

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  // Prefix unused variable with underscore
  // If you decide to display this later, remove the underscore and add it to renderContent
  const _orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantReference = searchParams.get("OrderMerchantReference");

  const [displayStatus, setDisplayStatus] = useState<PageDisplayStatus>("loading");
  const [message, setMessage] = useState<string>("Verifying payment status...");
  // Prefix unused state variable with underscore (or remove entirely if never needed)
  const [_internalOrderId, setInternalOrderId] = useState<string | null>(null);

  // --- Polling Logic Refs ---
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef<number>(0);
  const MAX_POLL_ATTEMPTS = 5;
  const POLL_INTERVAL_MS = 4000;

  // --- Fetch Function (Memoized) ---
  // Removed 'displayStatus' from dependency array to fix loop
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

    // Set message based on polling state
    if (!isPolling) {
        setDisplayStatus("loading"); // Ensure loading state on initial fetch
        setMessage("Verifying payment status...");
    } else {
        setMessage(`Checking status again... (Attempt ${pollAttemptsRef.current + 1})`);
    }
    console.log(`[Callback] ${isPolling ? 'Polling' : 'Fetching'} status for MerchantRef: ${merchantReference}, TrackingId: ${_orderTrackingId}`);

    try {
      let token: string | null = null;
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
      setInternalOrderId(data.orderId); // Set internal state (prefixed to silence warning)

      // --- Determine NEXT status based ONLY on fetched data ---
      let nextDisplayStatus: PageDisplayStatus = "unknown"; // Default
      let nextMessage = message; // Default to current message

      switch (data.status) {
        case 'Processing':
        case 'Completed':
          nextDisplayStatus = "success";
          nextMessage = 'Payment successful! Your order is being processed.';
          if (!isPolling) toast.success("Payment verified!");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          break;
        case 'Payment Failed':
        case 'Cancelled':
          nextDisplayStatus = "failed";
          nextMessage = `Payment ${data.paymentStatus?.toLowerCase() || 'failed/cancelled'}. Please try again or contact support.`;
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
                   nextDisplayStatus = "pending";
                   nextMessage = 'Payment verification is taking longer than expected. Please check your dashboard shortly.';
                   if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
               } else {
                   nextDisplayStatus = "loading"; // Keep loading during poll
                   // Message already updated at start of polling fetch
               }
          } else {
              console.log("[Callback] Initial status is Pending Payment. Starting polling...");
              nextDisplayStatus = "loading"; // Start loading
              nextMessage = "Waiting for final confirmation...";
              pollAttemptsRef.current = 1;
              if (!pollIntervalRef.current) {
                  pollIntervalRef.current = setInterval(() => fetchOrderStatusFromBackend(true), POLL_INTERVAL_MS);
              }
          }
          break;
      }

      // Use functional update for setDisplayStatus to avoid needing it as a dependency
      setDisplayStatus(prevStatus => {
          if (prevStatus !== nextDisplayStatus) {
              setMessage(nextMessage); // Update message only when status changes
              return nextDisplayStatus;
          }
          return prevStatus; // No change
      });

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
  // Removed displayStatus from dependencies, kept others used inside
  }, [merchantReference, currentUser, _orderTrackingId]);


  // Effect to run the initial fetch (after a delay)
  useEffect(() => {
    // Only run if merchantReference exists
    if (!merchantReference) {
        console.log("Callback Effect: No merchant reference, skipping effect.");
        setDisplayStatus("failed"); // Set failed state if ref is missing
        setMessage("Could not verify payment: Invalid callback URL (missing reference).")
        return;
    }
    // Delay the first fetch call
    const initialTimerId = setTimeout(() => { fetchOrderStatusFromBackend(false); }, 1500);
    // Cleanup function clears timeout and interval
    return () => {
        clearTimeout(initialTimerId);
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        pollAttemptsRef.current = 0;
    };
    // Effect depends on the memoized fetch function and the reference
  }, [fetchOrderStatusFromBackend, merchantReference]);


  // --- Render Content Function ---
  // This function returns the UI based on the displayStatus state
  const renderContent = (): React.ReactNode => {
    switch (displayStatus) {
      case 'loading': // Covers initial load AND subsequent polling intervals
        return (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mt-6">Verifying Payment...</h1>
            <p className="text-muted-foreground mt-2">{message}</p>
          </>
        );
      case 'pending': // Shown after polling times out
        return (
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
        return (
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
        return (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-red-500">Payment Failed</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
            <Link to="/engagement">
              <Button size="lg" variant="destructive" className="bg-red-600 hover:bg-red-700">
                Try Again
              </Button>
            </Link>
          </>
        );
      case 'unknown': // State for when fetch fails completely
      default:
        return (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                 <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-yellow-500">Status Check Error</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
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