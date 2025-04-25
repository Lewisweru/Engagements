// src/pages/EngagementPage.tsx
import { useState, useMemo, useEffect } from 'react';
import { motion } from "framer-motion";
import {
  Instagram, Facebook, Youtube, ArrowRight, Loader2, UserCheck, UserX,
  Twitter as XIcon // Twitter/X Icon
} from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "@/styles/emojiBackground.css"; // Assuming correct path
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/contexts/AuthContext'; // Import apiClient
import { formatCurrency } from '@/lib/utils';

// --- Keep Types & Constants as defined previously ---
type PlatformId = "tiktok" | "instagram" | "facebook" | "youtube" | "telegram" | "whatsapp" | "x";
type Quality = "standard" | "high";
type PricingStructure = Record<PlatformId, Record<Quality, Record<string, number>>>;
const PRICING: PricingStructure = { /* ... your pricing ... */
  tiktok:    { standard: { followers: 0.50, likes: 0.05, views: 0.004 },         high: { followers: 0.55, likes: 0.07, views: 0.005 } },
  instagram: { standard: { followers: 0.50, likes: 0.06, views: 0.01 },          high: { followers: 0.55, likes: 0.08, views: 0.02 } },
  facebook:  { standard: { pagelikes: 2.10, profilefollowers: 1.40, postlikes: 1.10, views: 0.06 }, high: { pagelikes: 2.20, profilefollowers: 1.44, postlikes: 1.13, views: 0.11 } },
  youtube:   { standard: { subscribers: 4.50, likes: 0.30, views: 1.20 },        high: { subscribers: 5.60, likes: 1.25, views: 1.45 } },
  telegram:  { standard: { members: 1.10, postviews: 0.03, postreactions: 0.06 }, high: { members: 2.10, postviews: 0.04, postreactions: 0.07 } },
  whatsapp:  { standard: { channelmembers: 2.50, emojireactions: 1.20 },       high: { channelmembers: 7.60, emojireactions: 2.50 } },
  x:         { standard: { followers: 7.60, likes: 1.90, retweets: 0.75 },       high: { followers: 7.70, likes: 2.10, retweets: 0.80 } },
};
const platformServices: Record<PlatformId, string[]> = { /* ... your services ... */
  tiktok:    ["Followers", "Likes", "Views"],
  instagram: ["Followers", "Likes", "Views"],
  facebook:  ["Page Likes", "Profile Followers", "Post Likes", "Views"],
  youtube:   ["Subscribers", "Likes", "Views"],
  telegram:  ["Members", "Post Views", "Post Reactions"],
  whatsapp:  ["Channel Members", "Emoji Reactions"],
  x:         ["Followers", "Likes", "Retweets"],
};
const platforms: { id: PlatformId; name: string; icon: JSX.Element; color: string }[] = [ /* ... your platforms ... */
  { id: "tiktok", name: "TikTok", icon: <FaTiktok className="h-5 w-5" />, color: "bg-black" },
  { id: "instagram", name: "Instagram", icon: <Instagram className="h-5 w-5" />, color: "bg-pink-500" },
  { id: "facebook", name: "Facebook", icon: <Facebook className="h-5 w-5" />, color: "bg-blue-600" },
  { id: "youtube", name: "YouTube", icon: <Youtube className="h-5 w-5" />, color: "bg-red-600" },
  { id: "telegram", name: "Telegram", icon: <SiTelegram className="h-5 w-5" />, color: "bg-blue-400" },
  { id: "whatsapp", name: "WhatsApp", icon: <SiWhatsapp className="h-5 w-5" />, color: "bg-green-500" },
  { id: "x", name: "Twitter (X)", icon: <XIcon className="h-5 w-5" />, color: "bg-gray-700" },
];
const MIN_QUANTITY = 100;
const MAX_QUANTITY = 100000;
// --- End Constants ---


export default function EngagementPage() {
  const { currentUser, loading: authLoading } = useAuth(); // Only need currentUser/authLoading here

  // ... (Keep existing state hooks: selectedPlatform, selectedService, etc.) ...
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | "">("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<Quality>("standard");
  const [accountLink, setAccountLink] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // ... (Keep existing derived state: serviceKey, totalPrice, currentPlatformServices) ...
   const generateServiceKey = (serviceName: string): string | null => {
       if (!serviceName) return null;
       return serviceName.toLowerCase().replace(/\s+/g, '');
  };
   const serviceKey = useMemo(() => generateServiceKey(selectedService), [selectedService]);
   const totalPrice = useMemo(() => {
    let calculatedBasePrice = 0;
    if (selectedPlatform && serviceKey && PRICING[selectedPlatform as PlatformId]?.[selectedQuality]?.[serviceKey]) {
         calculatedBasePrice = PRICING[selectedPlatform as PlatformId][selectedQuality][serviceKey];
    }
    const numericQuantity = Number(quantity);
    const calculatedTotalPrice = numericQuantity >= MIN_QUANTITY ? numericQuantity * calculatedBasePrice : 0;
     return Math.round(calculatedTotalPrice * 100) / 100;
  }, [selectedPlatform, serviceKey, selectedQuality, quantity]);
   const currentPlatformServices = useMemo(() => {
      return selectedPlatform ? platformServices[selectedPlatform as PlatformId] ?? [] : [];
  }, [selectedPlatform]);

  // ... (Keep existing useEffect to reset selections) ...
  useEffect(() => {
    setSelectedService("");
    setAccountLink("");
    setQuantity("");
    setSelectedQuality("standard");
  }, [selectedPlatform]);

  // --- Event Handlers ---
  const handleCheckout = async () => {
    // Validation Checks
    if (authLoading) { toast.error("Verifying user session..."); return; }
    if (!currentUser) { toast.error("Please log in to proceed."); return; }
    if (!selectedPlatform || !selectedService || !accountLink) { toast.error("Please complete all selections."); return; }
    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || numericQuantity < MIN_QUANTITY || numericQuantity > MAX_QUANTITY) { toast.error(`Invalid quantity (Min: ${MIN_QUANTITY}, Max: ${MAX_QUANTITY}).`); return; }
    if (totalPrice <= 0) { toast.error("Calculated price is zero or invalid."); return; }

    setIsCheckingOut(true);
    const loadingToastId = toast.loading("Initiating checkout..."); // Get toast ID

    try {
      // ** apiClient automatically adds the token via interceptor **
      // No need for: const token = await currentUser.getIdToken();

      const orderDetails = {
        platform: selectedPlatform,
        service: selectedService, // Make sure this matches backend expected values
        quality: selectedQuality,
        accountLink: accountLink,
        quantity: numericQuantity,
        // Backend calculates amount based on validated details
        currency: 'KES', // Assuming KES, backend should confirm/override
        callbackUrl: `${window.location.origin}/payment-callback`, // Verify this route exists in App.tsx
      };

      console.log("Sending order details to /orders/initiate:", orderDetails);

      // Use apiClient instance
      const response = await apiClient.post<{ redirectUrl?: string; message?: string }>( // Define expected response shape
          '/orders/initiate',
          orderDetails
      );

      toast.dismiss(loadingToastId); // Dismiss loading toast

      if (response.data.redirectUrl) {
          console.log("Redirecting to Pesapal:", response.data.redirectUrl);
          toast.success("Redirecting to payment gateway...");
          window.location.href = response.data.redirectUrl; // Redirect user
      } else {
          // Handle cases where backend doesn't provide a redirect URL
          throw new Error(response.data.message || "Payment initiation failed: No redirect URL received.");
      }

    } catch (error: any) {
      toast.dismiss(loadingToastId); // Dismiss loading toast on error
      console.error("Checkout Error:", error);
      const message = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Checkout failed. Please try again.';
      toast.error(`Checkout failed: ${message}`);
      setIsCheckingOut(false); // Reset loading state on error
    }
    // No finally block needed for setIsCheckingOut if redirect happens on success
  };

  // ... (Keep existing isCheckoutDisabled logic) ...
  const isCheckoutDisabled = isCheckingOut || authLoading || !currentUser || totalPrice <= 0 || !quantity || Number(quantity) < MIN_QUANTITY || Number(quantity) > MAX_QUANTITY || !selectedPlatform || !selectedService || !accountLink;

  // --- JSX ---
  // ... (Keep the existing JSX structure) ...
   return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative overflow-hidden min-h-screen">
      {/* <div className="emoji-background fixed inset-0 z-0"></div> */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        {/* --- Page Header --- */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 text-foreground tracking-tight">
            Boost Your Social Presence
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Select your platform, choose a service, and watch your engagement grow instantly.
          </p>
          <div className="mt-5 text-sm">
            {authLoading ? (
              <span className="flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Checking session...</span>
            ) : currentUser ? (
              <span className="flex items-center justify-center text-green-600 dark:text-green-400"><UserCheck className="h-4 w-4 mr-1" /> Logged in as {currentUser.displayName || currentUser.email}</span>
            ) : (
              <span className="flex items-center justify-center text-red-600 dark:text-red-400"><UserX className="h-4 w-4 mr-1" /> Please Log In</span>
            )}
          </div>
        </div>

        {/* --- Platform Selection --- */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
          {platforms.map((platform) => (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? "default" : "outline"}
              size="lg"
              onClick={() => setSelectedPlatform(platform.id)}
              className={`flex items-center space-x-2 transition-all duration-200 ease-in-out transform hover:scale-105 rounded-full px-5 py-2.5 ${
                selectedPlatform === platform.id ? 'ring-2 ring-offset-2 ring-primary ring-offset-background shadow-lg' : 'hover:bg-accent'
              }`}
            >
              <span className={`p-1.5 rounded-full ${platform.color} text-white flex items-center justify-center`}>
                {platform.icon}
              </span>
              <span className="text-sm md:text-base font-medium">{platform.name}</span>
            </Button>
          ))}
        </div>

        {/* --- Dynamic Form Area --- */}
        <div className="w-full max-w-lg mx-auto bg-card p-6 sm:p-8 rounded-xl shadow-xl border">

            {/* Service Selection Dropdown */}
            {selectedPlatform && (
            <motion.div
                key={`service-${selectedPlatform}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="mb-5"
            >
                <label htmlFor="service-select" className="block mb-2 text-sm font-medium text-foreground">Select Service</label>
                <select
                id="service-select"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-3 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                required
                >
                <option value="" disabled>-- Choose a Service --</option>
                {currentPlatformServices.map((service) => (
                    <option key={service} value={service}>
                    {service}
                    </option>
                ))}
                </select>
            </motion.div>
            )}

            {/* Quality Selection Buttons */}
            {selectedService && (
            <motion.div
                key={`quality-${selectedService}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-5"
            >
                <label className="block mb-2 text-sm font-medium text-foreground">Select Quality</label>
                <div className="grid grid-cols-2 gap-3">
                <Button
                    variant={selectedQuality === "standard" ? "secondary" : "outline"}
                    onClick={() => setSelectedQuality("standard")}
                    className="w-full py-3"
                    size="lg"
                >
                    Standard
                </Button>
                <Button
                    variant={selectedQuality === "high" ? "secondary" : "outline"}
                    onClick={() => setSelectedQuality("high")}
                    className="w-full py-3"
                    size="lg"
                >
                    High Quality
                </Button>
                </div>
            </motion.div>
            )}

            {/* Account Link Input */}
            {selectedService && (
            <motion.div
                key={`link-${selectedService}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
                className="mb-5"
            >
                <label htmlFor="account-link" className="block mb-2 text-sm font-medium text-foreground">
                 {/* Dynamic Label Logic */}
                 { selectedPlatform === 'whatsapp' && selectedService === 'Channel Members'
                    ? 'WhatsApp Channel Invite Link:'
                    : selectedPlatform === 'youtube' && selectedService === 'Subscribers'
                    ? 'YouTube Channel Link:'
                    : `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} ${selectedService.includes('Like') || selectedService.includes('View') || selectedService.includes('Retweet') || selectedService.includes('Reaction') || selectedService.includes('Share') ? 'Post/Video/Reel' : 'Profile/Page/Channel'} Link/URL:`
                 }
                </label>
                <input
                id="account-link"
                type="text"
                value={accountLink}
                onChange={(e) => setAccountLink(e.target.value)}
                placeholder="e.g., https://www.instagram.com/username/"
                className="w-full p-3 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                required
                />
            </motion.div>
            )}

            {/* Quantity Input and Checkout Button */}
            {accountLink && (
            <motion.div
                key={`checkout-${accountLink}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}
                className="mt-6"
            >
                <label htmlFor="quantity-input" className="block mb-2 text-sm font-medium text-foreground">Enter Quantity</label>
                <input
                id="quantity-input"
                type="number"
                value={quantity}
                min={MIN_QUANTITY}
                max={MAX_QUANTITY}
                step={50}
                onChange={(e) => {
                    const val = e.target.value;
                    setQuantity(val === "" ? "" : Number(val));
                }}
                className="w-full p-3 border rounded-md bg-background text-foreground text-center text-xl font-semibold focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`e.g., ${MIN_QUANTITY * 5}`}
                required
                />
                <p className="text-xs text-muted-foreground text-center mt-1">(Min: {MIN_QUANTITY}, Max: {MAX_QUANTITY})</p>

                {/* Total Price Display */}
                <div className="text-center my-5">
                     <span className="text-muted-foreground">Estimated Total: </span>
                     <span className="text-3xl font-bold text-primary">
                        {formatCurrency(totalPrice)}
                    </span>
                </div>

                {/* Checkout Button */}
                <Button
                onClick={handleCheckout}
                disabled={isCheckoutDisabled}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg"
                size="lg"
                >
                {isCheckingOut ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /><span>Processing...</span></>
                ) : authLoading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /><span>Verifying...</span></>
                ) : !currentUser ? (
                    <><UserX className="h-5 w-5" /><span>Login to Pay</span></>
                ) : (
                    <><ArrowRight className="h-5 w-5" /><span>Proceed to Payment</span></>
                )}
                </Button>

                {/* Login Prompt */}
                {authLoading === false && !currentUser && (
                    <p className="text-center text-xs text-yellow-600 dark:text-yellow-400 mt-3">
                        Login or signup is required to complete your order.
                    </p>
                )}
            </motion.div>
            )}
        </div> {/* End Form Area */}

      </motion.div>
    </div>
  );
}