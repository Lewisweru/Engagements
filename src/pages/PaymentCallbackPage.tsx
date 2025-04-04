// src/pages/PaymentCallbackPage.tsx (Rename the file)
import React, { useEffect, useState } from 'react'; // Import React
import { useSearchParams, Link, Navigate } from 'react-router-dom'; // Import Link, Navigate
import { motion } from "framer-motion";
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"; // Added AlertTriangle, Loader2
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth to potentially get token

// Define more specific status types reflecting your backend Order schema
type OrderStatus = 'Pending Payment' | 'Payment Failed' | 'Processing' | 'Completed' | 'Cancelled' | 'Unknown';
type PageDisplayStatus = 'loading' | 'success' | 'failed' | 'pending' | 'unknown';

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth(); // Get user to potentially use token

  // Get both parameters from URL
  const orderTrackingId = searchParams.get("OrderTrackingId"); // Pesapal's ID (might be null)
  const merchantReference = searchParams.get("OrderMerchantReference"); // Our pesapalOrderId (should exist)

  // State for display logic
  const [displayStatus, setDisplayStatus] = useState<PageDisplayStatus>("loading");
  const [message, setMessage] = useState<string>("Verifying payment status...");
  const [internalOrderId, setInternalOrderId] = useState<string | null>(null);

  useEffect(() => {
    console.log("Payment Callback Loaded. MerchantRef:", merchantReference, "TrackingId:", orderTrackingId);
    // Set loading initially
    setDisplayStatus("loading");
    setMessage("Verifying payment status...");

    // We need the merchantReference (our order ID sent to Pesapal) to query our backend
    if (!merchantReference) {
      console.error("Payment callback error: Missing OrderMerchantReference in URL.");
      toast.error("Invalid payment callback URL.");
      setMessage("Could not verify payment: Invalid callback URL.");
      setDisplayStatus("failed");
      return; // Stop if reference is missing
    }

    const fetchOrderStatusFromBackend = async () => {
      try {
        // Optionally get token if your status endpoint requires authentication
         let token: string | null = null;
         if (currentUser) {
             try {
                token = await currentUser.getIdToken();
             } catch (tokenError) {
                 console.error("Error getting auth token for status check:", tokenError);
                 // Proceed without token if endpoint is public, otherwise fail
             }
         }

        const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api/orders/status-by-ref/${merchantReference}`;
        console.log("Querying backend for status:", apiUrl);

        const response = await fetch(apiUrl, {
             method: 'GET',
             headers: {
                 'Content-Type': 'application/json',
                 // Conditionally add Authorization header if token exists and endpoint is protected
                 ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
             },
         });

        console.log("Backend status response:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch status (${response.status})`);
        }

        const data: { status: OrderStatus; paymentStatus: string | null; orderId: string } = await response.json();
        console.log("Backend status data:", data);
        setInternalOrderId(data.orderId); // Store our internal order ID

        // Update display based on YOUR backend's status
        // This status reflects IPN processing primarily
        switch (data.status) {
          case 'Processing': // Treat Processing as success for user feedback
          case 'Completed':
            setDisplayStatus("success");
            setMessage('Payment successful! Your order is being processed.');
            toast.success("Payment verified successfully!");
            break;
          case 'Payment Failed':
          case 'Cancelled':
            setDisplayStatus("failed");
            setMessage(`Payment ${data.paymentStatus?.toLowerCase() || 'failed'}. Please try again or contact support.`);
            toast.error("Payment verification failed.");
            break;
          case 'Pending Payment':
          default: // Includes 'Unknown' or unexpected statuses
             // Still waiting for IPN maybe? Or an issue occurred.
             // Keep showing processing or an uncertain state.
             setDisplayStatus("pending");
             setMessage('Payment verification is taking longer than usual. Please check your dashboard shortly or contact support.');
             toast.loading("Verifying payment status..."); // Use loading toast
            break;
        }
      } catch (error: any) {
        console.error("Error fetching order status from backend:", error);
        setMessage(`Error verifying payment status: ${error.message}`);
        toast.error("Could not verify payment status.");
        setDisplayStatus("unknown"); // Use a distinct unknown state
      }
    };

    // Fetch status after a short delay to potentially allow IPN to arrive first
    const timerId = setTimeout(fetchOrderStatusFromBackend, 1500); // Delay 1.5 seconds

    // Cleanup function to clear timeout if component unmounts
    return () => clearTimeout(timerId);

  }, [merchantReference, orderTrackingId, currentUser]); // Rerun if these change (though they usually won't)


  // --- Render based on displayStatus ---
  const renderContent = () => {
    switch (displayStatus) {
      case 'loading':
      case 'pending': // Show spinner for loading and pending verification
        return (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mt-6">{displayStatus === 'loading' ? 'Verifying Payment...' : 'Verification Pending...'}</h1>
            <p className="text-muted-foreground mt-2">{message}</p>
          </>
        );
      case 'success':
        return (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-green-500">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2 mb-6">
              {message}
            </p>
            {/* Use Link for internal navigation */}
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
            <p className="text-muted-foreground mt-2 mb-6">
              {message}
            </p>
            {/* Link back to engagement page to try again */}
            <Link to="/engagement">
              <Button size="lg" variant="destructive" className="bg-red-600 hover:bg-red-700">
                Try Again
              </Button>
            </Link>
            {/* Optional link to contact/support */}
            {/* <Link to="/support" className="ml-4">
                 <Button variant="outline">Contact Support</Button>
             </Link> */}
          </>
        );
      case 'unknown':
      default:
        return (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                 <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold mt-6 text-yellow-500">Status Unknown</h1>
            <p className="text-muted-foreground mt-2 mb-6">
              {message}
            </p>
            <Link to="/dashboard">
              <Button size="lg" variant="outline">Check Dashboard</Button>
            </Link>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full bg-background/80 dark:bg-gray-900/80 backdrop-blur-md rounded-lg shadow-lg p-8 text-center border border-border" // Use theme variables
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}