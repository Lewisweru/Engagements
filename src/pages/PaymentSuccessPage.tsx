import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { queryPesapalPaymentStatus } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderTrackingId = searchParams.get("orderTrackingId");
  const [paymentStatus, setPaymentStatus] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      if (orderTrackingId) {
        try {
          const statusResponse = await queryPesapalPaymentStatus(orderTrackingId);
          if (statusResponse.status === "COMPLETED") {
            setPaymentStatus("success");
            toast.success("Payment successful!");
          } else {
            setPaymentStatus("failed");
            toast.error("Payment failed or was canceled.");
          }
        } catch (error) {
          setPaymentStatus("failed");
          toast.error("Failed to fetch payment status.");
        }
      }
    };

    fetchPaymentStatus();
  }, [orderTrackingId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full bg-gray-900/80 backdrop-blur-md rounded-lg shadow-lg p-8 text-center border border-gray-700"
      >
        {paymentStatus === "loading" && (
          <div>
            <motion.div
              className="w-16 h-16 border-4 border-t-green-500 border-gray-700 rounded-full animate-spin mx-auto"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
            ></motion.div>
            <h1 className="text-2xl font-bold mt-6">Processing Payment...</h1>
            <p className="text-gray-400 mt-2">Please wait while we verify your payment.</p>
          </div>
        )}

        {paymentStatus === "success" && (
          <div>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto animate-pulse" />
            <h1 className="text-3xl font-bold mt-6">Payment Successful!</h1>
            <p className="text-gray-400 mt-2">
              Thank you for your payment. Your transaction has been completed successfully.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <a
                href="/dashboard"
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md transition-all"
              >
                Go to Dashboard
              </a>
            </motion.div>
          </div>
        )}

        {paymentStatus === "failed" && (
          <div>
            <XCircle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
            <h1 className="text-3xl font-bold mt-6">Payment Failed</h1>
            <p className="text-gray-400 mt-2">
              Unfortunately, your payment could not be processed. Please try again or contact support.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <a
                href="/checkout"
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all"
              >
                Try Again
              </a>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}