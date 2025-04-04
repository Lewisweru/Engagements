// src/pages/PaymentCallbackPage.js
import React, { useEffect, useState } from 'react'; // Keep React import for hooks
import { useSearchParams, Link } from 'react-router-dom'; // Import Link
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth if needed for token
import { Button } from "@/components/ui/button"; // Import Button

// No TypeScript types needed here in JS

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth(); // Get user if needed for authenticated status check

  // Get parameters from URL query string
  const orderTrackingId = searchParams.get("OrderTrackingId"); // Pesapal's ID (might be null)
  const merchantReference = searchParams.get("OrderMerchantReference"); // Our pesapalOrderId (should exist)

  // State for managing the UI display - initialize with string literals
  const [displayStatus, setDisplayStatus] = useState("loading"); // 'loading' | 'success' | 'failed' | 'pending' | 'unknown'
  const [message, setMessage] = useState("Verifying payment status...");
  // const [internalOrderId, setInternalOrderId] = useState(null); // Store internal ID if needed later (use null for empty state)

  useEffect(() => {
    // Log entry and extracted params
    console.log("Payment Callback Loaded. MerchantRef:", merchantReference, "TrackingId:", orderTrackingId);
    setDisplayStatus("loading"); // Ensure loading state on mount/change
    setMessage("Verifying payment status...");

    // --- Validation: Check for essential merchantReference ---
    if (!merchantReference) {
      console.error("Payment callback error: Missing OrderMerchantReference in URL.");
      toast.error("Invalid payment callback URL.");
      setMessage("Could not verify payment: Invalid callback URL.");
      setDisplayStatus("failed"); // Set to failed state
      return; // Stop execution
    }

    // --- Function to Fetch Status from YOUR Backend ---
    const fetchOrderStatusFromBackend = async () => {
      try {
        let token = null; // Initialize token as null
        // Get token only if user is likely logged in and endpoint is protected
        if (currentUser) {
             try { token = await currentUser.getIdToken(); }
             catch (tokenError) { console.error("Callback: Error getting token", tokenError); }
         }

        // Construct the URL for your backend endpoint
        const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api/orders/status-by-ref/${merchantReference}`;
        console.log("Querying backend for status:", apiUrl);

        // Prepare headers, including Authorization if token exists
        const headers = { 'Content-Type': 'application/json' }; // Basic headers
        if (token) { headers['Authorization'] = `Bearer ${token}`; } // Add auth header if token exists

        // Make the fetch request
        const response = await fetch(apiUrl, { method: 'GET', headers: headers });
        console.log("Backend status response:", response.status);

        // Check if the request was successful
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Request failed with status: ${response.status}` }));
          throw new Error(errorData.message || `Failed to fetch status`);
        }

        // Parse the JSON response from your backend
        const data = await response.json(); // Expecting { status: OrderStatus; paymentStatus: string | null; orderId: string }
        console.log("Backend status data:", data);
        // setInternalOrderId(data.orderId); // Set if needed

        // --- Update UI based on YOUR internal order status ---
        switch (data.status) { // Use data.status from YOUR database
          case 'Processing': // Treat as success for initial feedback
          case 'Completed':
            setDisplayStatus("success");
            setMessage('Payment successful! Your order is being processed.');
            toast.success("Payment verified successfully!");
            break;
          case 'Payment Failed':
          case 'Cancelled':
            setDisplayStatus("failed");
            setMessage(`Payment ${data.paymentStatus?.toLowerCase() || 'failed/cancelled'}. Please try again or contact support.`);
            toast.error("Payment verification indicated failure.");
            break;
          case 'Pending Payment':
          default: // Includes 'Unknown' or unexpected statuses
             setDisplayStatus("pending");
             setMessage('Payment verification is still pending. This might take a moment. Please check your dashboard shortly or contact support.');
             toast.loading("Verifying payment status...", { duration: 4000 });
            break;
        }
        // --- End UI Update ---

      } catch (error) { // Catch block doesn't need type annotation for 'error'
        console.error("Error fetching order status from backend:", error);
        setMessage(`Error verifying payment status: ${error.message}`);
        toast.error("Could not verify payment status.");
        setDisplayStatus("unknown"); // Use a distinct unknown state
      }
    };

    // Fetch status after a delay to allow IPN potentially process first
    const timerId = setTimeout(fetchOrderStatusFromBackend, 2500); // Delay 2.5 seconds

    // Cleanup function for the timeout
    return () => clearTimeout(timerId);

  }, [merchantReference, currentUser]); // Dependencies for the effect


  // --- Define the renderContent function ---
  // This function returns JSX based on the displayStatus state
  const renderContent = () => {
    switch (displayStatus) { // Use the displayStatus state here
      case 'loading':
      case 'pending':
        return ( // Return JSX
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mt-6">
              {displayStatus === 'loading' ? 'Verifying Payment...' : 'Verification Pending...'}
            </h1>
            <p className="text-muted-foreground mt-2">{message}</p> {/* Use message state */}
          </>
        );
      case 'success':
        return ( // Return JSX
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-green-500">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p> {/* Use message state */}
            <Link to="/dashboard"> {/* Use Link component */}
              <Button size="lg" className="bg-green-600 hover:bg-green-700">Go to Dashboard</Button> {/* Use Button component */}
            </Link>
          </>
        );
      case 'failed':
        return ( // Return JSX
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-red-500">Payment Failed</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p> {/* Use message state */}
            <Link to="/engagement"> {/* Use Link component */}
              <Button size="lg" variant="destructive" className="bg-red-600 hover:bg-red-700">
                Try Again
              </Button> {/* Use Button component */}
            </Link>
            {/* <Link to="/support" className="ml-4"><Button variant="outline">Contact Support</Button></Link> */}
          </>
        );
      case 'unknown':
      default:
        return ( // Return JSX
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                 <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-yellow-500">Status Unknown</h1>
            <p className="text-muted-foreground mt-2 mb-6">{message}</p> {/* Use message state */}
            <Link to="/dashboard"> {/* Use Link component */}
              <Button size="lg" variant="outline">Check Dashboard</Button> {/* Use Button component */}
            </Link>
          </>
        );
    }
  };
  // --- End renderContent function ---


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full bg-background/80 dark:bg-gray-900/80 backdrop-blur-md rounded-lg shadow-lg p-8 text-center border border-border" // Use theme variables
      >
        {/* Call the renderContent function here to display the UI */}
        {renderContent()}
      </motion.div>
    </div>
  );
}