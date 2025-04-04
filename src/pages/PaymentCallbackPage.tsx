// src/pages/PaymentCallbackPage.tsx (TypeScript Version - Corrected)

import { useEffect, useState, useRef, useCallback } from 'react'; // React import often not needed with new JSX transform
import { useSearchParams, Link } from 'react-router-dom'; // Keep Link
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext'; // Keep useAuth
import { Button } from "@/components/ui/button"; // Keep Button

// Define more specific status types reflecting your backend Order schema
type OrderStatus = 'Pending Payment' | 'Payment Failed' | 'Processing' | 'Completed' | 'Cancelled' | 'Unknown';
// Define the states the UI can be in
type PageDisplayStatus = 'loading' | 'success' | 'failed' | 'pending' | 'unknown';

// Define the expected structure of the successful data from your backend status endpoint
interface BackendStatusResponse {
    status: OrderStatus;
    paymentStatus: string | null;
    orderId: string;
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
  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantReference = searchParams.get("OrderMerchantReference"); // Our pesapalOrderId

  // State for managing the UI display with explicit types
  const [displayStatus, setDisplayStatus] = useState<PageDisplayStatus>("loading");
  const [message, setMessage] = useState<string>("Verifying payment status...");
  const [internalOrderId, setInternalOrderId] = useState<string | null>(null); // Store internal ID if needed

  // --- Polling Logic ---
  // Explicitly type interval ID or null. Requires @types/node (`npm install -D @types/node`)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef<number>(0);
  const MAX_POLL_ATTEMPTS = 5; // How many times to check status
  const POLL_INTERVAL_MS = 4000; // Check every 4 seconds
  // --- End Polling Logic ---

  // Use useCallback to memoize the fetch function
  // Ensures the function reference doesn't change on every render unless dependencies change
  const fetchOrderStatusFromBackend = useCallback(async (isPolling = false) => {
    // Check for merchantReference inside callback as it's a dependency
    if (!merchantReference) {
        if (!isPolling) { // Only show initial error if reference missing on first load
             console.error("Payment callback error: Missing OrderMerchantReference.");
             toast.error("Invalid payment callback URL.");
             setMessage("Could not verify payment: Invalid callback URL.");
             setDisplayStatus("failed");
             if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); // Clear interval on validation error
        }
        return; // Stop execution
    }

    // Set loading state only on initial fetch, not polls
    if(!isPolling) {
        setDisplayStatus("loading");
        setMessage("Verifying payment status...");
    }
    console.log(`[Callback] ${isPolling ? 'Polling' : 'Fetching'} status for MerchantRef: ${merchantReference}`);

    try {
      let token: string | null = null; // Explicit type for token
      // Get Firebase token if user exists (needed if status endpoint is protected)
      if (currentUser) {
        try { token = await currentUser.getIdToken(); }
        catch (tokenError) { console.error("Callback: Error getting auth token", tokenError); }
      }

      // Construct backend API URL
      const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api/orders/status-by-ref/${merchantReference}`;
      // Explicitly type headers using HeadersInit
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) { headers['Authorization'] = `Bearer ${token}`; } // Add auth header if token exists

      // Make the GET request to your backend
      const response = await fetch(apiUrl, { method: 'GET', headers: headers });
      console.log("[Callback] Backend status response code:", response.status);

      // Check if the backend request failed
      if (!response.ok) {
        // Try to parse JSON error message from backend, provide default if parsing fails
        const errorData: FetchErrorResponse = await response.json().catch(() => ({ message: `Request failed (${response.status})` }));
        throw new Error(errorData.message || `Failed to fetch status`);
      }

      // Parse successful JSON response, expecting BackendStatusResponse structure
      const data: BackendStatusResponse = await response.json();
      console.log("[Callback] Backend status data received:", data);
      setInternalOrderId(data.orderId); // Store internal order ID if needed

      // Process the status received from *your* database
      let currentDisplayStatus: PageDisplayStatus = displayStatus; // Variable to hold the next display state

      switch (data.status) { // Switch based on your internal DB status
        case 'Processing': // Treat Processing as a success for the user here
        case 'Completed':
          currentDisplayStatus = "success";
          setMessage('Payment successful! Your order is being processed.');
          if (!isPolling) toast.success("Payment verified!"); // Show toast only on first success
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); // Stop polling
          break;

        case 'Payment Failed':
        case 'Cancelled':
          currentDisplayStatus = "failed";
          setMessage(`Payment ${data.paymentStatus?.toLowerCase() || 'failed/cancelled'}. Please try again or contact support.`);
          if (!isPolling) toast.error("Payment verification indicated failure.");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); // Stop polling
          break;

        case 'Pending Payment':
        default: // Includes 'Unknown' or other unexpected statuses from your DB
          if (isPolling) {
              // If still pending during a poll check
               pollAttemptsRef.current += 1;
               console.log(`[Callback] Status still '${data.status}'. Poll attempt ${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS}.`);
               if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
                   // Stop polling after max attempts
                   console.log("[Callback] Max poll attempts reached. Setting status to pending.");
                   currentDisplayStatus = "pending"; // Show final pending state
                   setMessage('Payment verification is taking longer than expected. Please check your dashboard shortly or contact support.');
                   if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
               } else {
                   // Continue polling - keep UI in loading state
                   currentDisplayStatus = "loading";
                   setMessage("Waiting for final confirmation...");
               }
          } else {
              // If initial fetch result is pending, start polling
              console.log("[Callback] Initial status is Pending Payment. Starting polling...");
              currentDisplayStatus = "loading"; // Show loading while polling starts
              setMessage("Waiting for final confirmation...");
              pollAttemptsRef.current = 1; // Start attempt count
              // Prevent multiple intervals if effect runs again quickly
              if (!pollIntervalRef.current) {
                  pollIntervalRef.current = setInterval(() => fetchOrderStatusFromBackend(true), POLL_INTERVAL_MS);
              }
          }
          break;
      }
      // Update the display status state
      setDisplayStatus(currentDisplayStatus);

    } catch (error: unknown) { // Catch block: Type error as unknown
      // Type guard to safely access error properties
      let errorMessage = "An unknown error occurred while verifying status";
      if (error instanceof Error) {
          errorMessage = error.message; // Use message property if it's an Error instance
      } else if (typeof error === 'string') {
           errorMessage = error; // Use error directly if it's a string
      }
      console.error("Error in fetchOrderStatusFromBackend:", errorMessage);
      setMessage(`Error verifying payment status: ${errorMessage}`);
      if (!isPolling) toast.error("Could not verify payment status."); // Show toast only on initial fetch error
      setDisplayStatus("unknown"); // Set to unknown/error state
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); // Stop polling on any error
    }
  }, [merchantReference, currentUser, displayStatus]); // Dependencies for useCallback


  // Effect to run the initial fetch (after a delay)
  useEffect(() => {
    // Only run if merchantReference is available
    if (!merchantReference) {
        console.log("Callback Effect: No merchant reference, skipping fetch.");
        return;
    }

    // Delay the *first* fetch call slightly
    const initialTimerId = setTimeout(() => {
        fetchOrderStatusFromBackend(false); // false indicates it's the initial call, not a poll
    }, 1500); // Initial delay (e.g., 1.5 seconds)

    // Cleanup function: clear timeout and interval when component unmounts or dependencies change
    return () => {
        clearTimeout(initialTimerId);
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null; // Reset ref
        }
        pollAttemptsRef.current = 0; // Reset attempts count
    };
    // This effect depends on fetchOrderStatusFromBackend (memoized) and merchantReference
  }, [fetchOrderStatusFromBackend, merchantReference]);


  // --- Render Content Function ---
  // Determines what UI to show based on the displayStatus state
  // Add explicit return type React.ReactNode
  const renderContent = (): React.ReactNode => {
    switch (displayStatus) {
      case 'loading': // Covers initial load and subsequent polling intervals
        return (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mt-6">Verifying Payment...</h1>
            <p className="text-muted-foreground mt-2">{message}</p>
          </>
        );
      case 'pending': // Shown after polling times out and status is still pending
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
        {/* Call the function to render the appropriate UI */}
        {renderContent()}
      </motion.div>
    </div>
  );
}