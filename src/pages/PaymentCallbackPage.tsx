// src/pages/PaymentCallbackPage.tsx (Corrected for TS errors)

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { apiClient } from '@/contexts/AuthContext'; // Import apiClient

// Define types
type OrderStatus = 'Pending Payment' | 'Payment Failed' | 'Processing' | 'Completed' | 'Cancelled' | 'Unknown' | 'Expired' | 'Supplier Error';
type PageDisplayStatus = 'loading' | 'success' | 'failed' | 'pending' | 'unknown';
interface BackendStatusResponse {
    status: OrderStatus;
    paymentStatus: string | null;
    orderId: string; // Expecting orderId from backend
}
// REMOVED unused FetchErrorResponse interface

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  // Keep currentUser even if unused directly - apiClient relies on its state in context
  useAuth();

  const orderTrackingId = searchParams.get("OrderTrackingId"); // Keep for logging/display
  const merchantReference = searchParams.get("OrderMerchantReference");

  const [displayStatus, setDisplayStatus] = useState<PageDisplayStatus>("loading");
  const [message, setMessage] = useState<string>("Verifying payment status...");
  // REMOVED unused internalOrderId state
  // const [_internalOrderId, setInternalOrderId] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef<number>(0);
  const MAX_POLL_ATTEMPTS = 5;
  const POLL_INTERVAL_MS = 4000;

  // --- Fetch Function (Memoized & Uses apiClient) ---
  const fetchOrderStatusFromBackend = useCallback(async (isPolling = false) => {
    if (!merchantReference) {
        if (!isPolling) {
             console.error("[Callback] Missing OrderMerchantReference.");
             toast.error("Invalid payment callback URL.");
             setMessage("Could not verify payment: Invalid callback URL.");
             setDisplayStatus("failed");
             if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
        return;
    }

    // Use functional update for immediate feedback during polling
    // Keep 'loading' state while polling, otherwise set initial message
    setDisplayStatus('loading');
    setMessage(() => isPolling ? `Checking status again... (Attempt ${pollAttemptsRef.current + 1})` : "Verifying payment status...");

    console.log(`[Callback] ${isPolling ? 'Polling' : 'Fetching'} status for MerchantRef: ${merchantReference}, TrackingId: ${orderTrackingId}`);

    try {
        // apiClient automatically includes the token if currentUser exists
        const apiUrl = `/orders/status-by-ref/${merchantReference}`; // Relative URL
        const response = await apiClient.get<BackendStatusResponse>(apiUrl);

      console.log("[Callback] Backend status response code:", response.status);
      const data = response.data;
      console.log("[Callback] Backend status data received:", data);
      // REMOVED setInternalOrderId call
      // setInternalOrderId(data.orderId);

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
        default:
          if (isPolling) {
               pollAttemptsRef.current += 1;
               console.log(`[Callback] Status still '${data.status}'. Poll attempt ${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS}.`);
               if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
                   console.log("[Callback] Max poll attempts reached.");
                   nextDisplayStatus = "pending";
                   nextMessage = 'Payment verification is taking longer than expected. Please check your dashboard shortly or contact support if issues persist.';
                   // Replace toast.warn with standard toast + icon
                   toast(nextMessage, { icon: '⏳' });
                   if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
               } else {
                   nextDisplayStatus = "loading"; // Keep loading during poll
                   // Message already updated at start of polling fetch
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

      // Update state using functional updates where previous state matters
      // Keep functional update for setDisplayStatus as it compares previous state
      setDisplayStatus(prevStatus => {
          // Update message only when status *actually* changes to avoid flicker
          if (prevStatus !== nextDisplayStatus) {
               setMessage(nextMessage);
               return nextDisplayStatus;
          }
          return prevStatus; // No change in display status
      });
      // Directly set message if not using functional update for it
      // setMessage(nextMessage);


    } catch (error: any) {
        let errorMessage = "An unknown error occurred";
        if (error.response?.data?.error?.message) errorMessage = error.response.data.error.message;
        else if (error.response?.data?.message) errorMessage = error.response.data.message;
        else if (error.message) errorMessage = error.message;

        console.error("[Callback] Error in fetchOrderStatusFromBackend:", error);
        setMessage(`Error verifying payment status: ${errorMessage}`);
        if (!isPolling) toast.error("Could not verify payment status.");
        setDisplayStatus("unknown");
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [merchantReference, orderTrackingId]); // Dependencies are correct


  // Effect to run the initial fetch
  useEffect(() => {
    if (!merchantReference) {
        console.log("[Callback Effect] No merchant reference, setting failed state.");
        setDisplayStatus("failed");
        setMessage("Could not verify payment: Invalid callback URL (missing reference).")
        return; // Exit early
    }
    const initialTimerId = setTimeout(() => {
        fetchOrderStatusFromBackend(false);
    }, 1000);
    return () => {
        clearTimeout(initialTimerId);
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        pollAttemptsRef.current = 0;
    };
  }, [fetchOrderStatusFromBackend, merchantReference]);


  // --- Render Content Function (Keep as is) ---
  const renderContent = (): React.ReactNode => {
    switch (displayStatus) {
      case 'loading':
        return (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mt-6">Verifying Payment...</h1>
            <p className="text-muted-foreground mt-2">{message}</p>
          </>
        );
      case 'pending':
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
            <h1 className="text-3xl font-bold mt-6 text-red-500">Payment Failed/Cancelled</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p>
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
  // --- End renderContent function ---


  // --- Main Component Return (Keep as is) ---
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