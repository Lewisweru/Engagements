import { useState } from "react"; // Import React
import { motion } from "framer-motion";
import {
  Instagram,
  Facebook,
  Youtube,
  TrendingUp,
  ArrowRight,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import { Twitter as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button"; // Ensure path is correct
import toast from "react-hot-toast";
import "@/styles/emojiBackground.css"; // Ensure this path is correct
// import { initiatePesapalPayment } from "@/lib/utils"; // REMOVE direct Pesapal util import if it was frontend only
// import { v4 as uuidv4 } from "uuid"; // No longer needed here, backend generates pesapalOrderId
import { useAuth } from '@/contexts/AuthContext'; // Ensure path is correct

// --- Constants ---
/** Platform-based Pricing with Standard and High Quality */
const PRICING = {
  tiktok: { standard: { followers: 0.5, likes: 0.05, views: 0.004 }, high: { followers: 0.55, likes: 0.07, views: 0.06 } },
  instagram: { standard: { followers: 0.5, likes: 0.06, views: 0.05 }, high: { followers: 0.55, likes: 0.08, views: 0.07 } },
  facebook: { standard: { pageLikes: 0.5, postLikes: 0.7, postShares: 0.6 }, high: { pageLikes: 0.55, postLikes: 0.9, postShares: 0.8 } },
  youtube: { standard: { subscribers: 1.2, likes: 0.9, views: 0.8, watchHours: 2.5 }, high: { subscribers: 1.5, likes: 1.2, views: 1.0, watchHours: 3.0 } },
  telegram: { standard: { channelMembers: 0.7, groupMembers: 0.6, postViews: 0.5 }, high: { channelMembers: 0.9, groupMembers: 0.8, postViews: 0.7 } },
  whatsapp: { standard: { groupJoins: 0.4, statusViews: 0.3 }, high: { groupJoins: 0.6, statusViews: 0.5 } },
  x: { standard: { followers: 0.8, likes: 0.7, retweets: 0.6, comments: 0.5 }, high: { followers: 1.0, likes: 0.9, retweets: 0.8, comments: 0.7 } },
};

const platformServices = {
  tiktok: ["Followers", "Likes", "Views"],
  instagram: ["Followers", "Likes", "Views"],
  facebook: ["Page Likes", "Post Likes", "Post Shares"],
  youtube: ["Subscribers", "Likes", "Views", "Watch Hours"],
  telegram: ["Channel Members", "Group Members", "Post Views"],
  whatsapp: ["Group Joins", "Status Views"],
  x: ["Followers", "Likes", "Retweets", "Comments"],
};

const platforms: { id: keyof typeof platformServices; name: string; icon: JSX.Element; color: string }[] = [
  { id: "tiktok", name: "TikTok", icon: <TrendingUp className="h-5 w-5" />, color: "bg-black" },
  { id: "instagram", name: "Instagram", icon: <Instagram className="h-5 w-5" />, color: "bg-pink-500" },
  { id: "facebook", name: "Facebook", icon: <Facebook className="h-5 w-5" />, color: "bg-blue-600" },
  { id: "youtube", name: "YouTube", icon: <Youtube className="h-5 w-5" />, color: "bg-red-600" },
  { id: "telegram", name: "Telegram", icon: <TrendingUp className="h-5 w-5 rotate-45" />, color: "bg-blue-400" },
  { id: "whatsapp", name: "WhatsApp", icon: <TrendingUp className="h-5 w-5 rotate-180" />, color: "bg-green-500" },
  { id: "x", name: "Twitter (X)", icon: <XIcon className="h-5 w-5" />, color: "bg-gray-700" },
];
// --- End Constants ---


// --- Component Definition ---
export default function EngagementPage() {
  const { currentUser, loading: authLoading } = useAuth(); // Get user and auth loading state

  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformServices | "">("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<"standard" | "high">("standard");
  const [accountLink, setAccountLink] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [isCheckingOut, setIsCheckingOut] = useState(false); // Loading state for checkout

  // Calculate total price dynamically
  // Ensure robust key generation (trim, lowercase, remove spaces)
  const generateServiceKey = (serviceName: string): string | null => {
       if (!serviceName) return null;
       return serviceName.toLowerCase().replace(/\s+/g, '');
  };
  const serviceKey = generateServiceKey(selectedService);

  const basePrice =
      selectedPlatform && serviceKey && PRICING[selectedPlatform]?.[selectedQuality]?.[serviceKey as keyof typeof PRICING[keyof typeof PRICING][keyof typeof PRICING[keyof typeof PRICING]]]
          ? PRICING[selectedPlatform][selectedQuality][serviceKey as keyof typeof PRICING[keyof typeof PRICING][keyof typeof PRICING[keyof typeof PRICING]]]
          : 0;

  const totalPrice = typeof quantity === 'number' && quantity >= 100 ? quantity * basePrice : 0;

  // --- Event Handlers ---

  const handleCheckout = async () => {
    // --- Validation Checks ---
    if (authLoading) {
      toast.error("Verifying user session...");
      return;
    }
    if (!currentUser) {
      toast.error("Please log in to proceed with payment.");
      // Optional: Redirect to login
      // navigate('/auth');
      return;
    }
    if (!selectedPlatform || !selectedService || !accountLink) {
      toast.error("Please complete all selections (Platform, Service, Link).");
      return;
    }
    if (typeof quantity !== 'number' || quantity < 100 || quantity > 100000) {
      toast.error("Invalid quantity. Minimum is 100, Max 100,000.");
      return;
    }
    if (totalPrice <= 0) {
      toast.error("Cannot checkout with zero total price.");
      return;
    }
    // --- End Validation ---

    setIsCheckingOut(true); // Start loading spinner on button
    try {
      const token = await currentUser.getIdToken(); // Get Firebase auth token

      // Prepare order data for the backend
      const orderDetails = {
        platform: selectedPlatform,
        service: selectedService,
        quality: selectedQuality,
        accountLink: accountLink,
        quantity: quantity, // Ensure quantity is a number here
        amount: totalPrice,
        currency: 'KES', // Or determine dynamically if needed
        description: `${quantity} ${selectedQuality} ${platformServices[selectedPlatform]?.find(s => s === selectedService) || selectedService} for ${selectedPlatform}`, // Generate descriptive text
        // Define the URL where user should return AFTER payment attempt on Pesapal
        callbackUrl: `${window.location.origin}/payment-success`, // Replace with your actual callback route
      };

      console.log("Sending order details to backend:", orderDetails);

      // Call your backend endpoint to initiate the order and get Pesapal redirect URL
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Send Firebase token for backend authentication
        },
        body: JSON.stringify(orderDetails),
      });

      if (!response.ok) {
        // Try to parse error message from backend
        const errorData = await response.json().catch(() => ({ message: `Request failed with status: ${response.status}` }));
        throw new Error(errorData.message || `Failed to initiate payment.`);
      }

      const result = await response.json();

      // Backend should return the Pesapal redirect URL
      if (result.redirectUrl) {
        console.log("Redirecting to Pesapal:", result.redirectUrl);
        window.location.href = result.redirectUrl; // Redirect user to Pesapal
        // Don't set isCheckingOut(false) here, as the page navigates away
      } else {
        // This case should ideally be handled by backend error response, but added as safeguard
        throw new Error("Payment initiation response missing redirect URL.");
      }

    } catch (error: any) {
      console.error("Checkout Error:", error);
      toast.error(`Checkout failed: ${error.message || 'Please try again.'}`);
      setIsCheckingOut(false); // Stop loading spinner on error
    }
  };
  // --- End Event Handlers ---


  // Determine if checkout should be disabled
  const isCheckoutDisabled = isCheckingOut || authLoading || !currentUser || totalPrice <= 0 || !quantity || typeof quantity !== 'number' || quantity < 100;


  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative overflow-hidden">
      {/* Placeholder for background effect if needed */}
      {/* <div className="emoji-background"></div> */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10" // Ensure content is properly layered if background is used
      >
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Social Media Engagement Services</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Boost your social media presence instantly. Select a platform and service below.
          </p>
          {/* Auth Status Display */}
          <div className="mt-4 text-sm">
            {authLoading ? (
              <span className="flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Checking status...</span>
            ) : currentUser ? (
              <span className="flex items-center justify-center text-green-600 dark:text-green-400"><UserCheck className="h-4 w-4 mr-1" /> Logged in as {currentUser.displayName || currentUser.email}</span>
            ) : (
              <span className="flex items-center justify-center text-red-600 dark:text-red-400"><UserX className="h-4 w-4 mr-1" /> Not logged in</span>
            )}
          </div>
        </div>

        {/* Platform Selection Buttons */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-8">
          {platforms.map((platform) => (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? "default" : "outline"}
              size="lg"
              onClick={() => {
                setSelectedPlatform(platform.id);
                setSelectedService("");
                setAccountLink("");
                setQuantity("");
                setSelectedQuality("standard");
              }}
              className={`flex items-center space-x-2 transition-all duration-200 ease-in-out transform hover:scale-105 ${
                selectedPlatform === platform.id ? 'ring-2 ring-offset-2 ring-primary ring-offset-background' : ''
              }`}
            >
              <span className={`p-1 rounded-md ${platform.color} text-white`}>
                {platform.icon}
              </span>
              <span className="text-sm md:text-base font-medium">{platform.name}</span>
            </Button>
          ))}
        </div>

        {/* Dynamic Form Sections */}

        {/* Service Selection Dropdown */}
        {selectedPlatform && (
          <motion.div
            key={`service-${selectedPlatform}`} // Ensures animation resets on platform change
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md mx-auto mb-4"
          >
            <label htmlFor="service-select" className="block mb-2 font-semibold text-foreground">Select Service:</label>
            <select
              id="service-select"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full p-3 border rounded-md bg-card text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent" // Use card colors
            >
              <option value="">-- Choose a Service --</option>
              {platformServices[selectedPlatform]?.map((service) => (
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
            key={`quality-${selectedService}`} // Optional key for animation
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full max-w-md mx-auto mt-4 mb-4"
          >
            <label className="block mb-2 font-semibold text-foreground">Select Quality:</label>
            <div className="flex justify-center space-x-4">
              <Button
                variant={selectedQuality === "standard" ? "secondary" : "outline"}
                onClick={() => setSelectedQuality("standard")}
                className="flex-1"
              >
                Standard
              </Button>
              <Button
                variant={selectedQuality === "high" ? "secondary" : "outline"}
                onClick={() => setSelectedQuality("high")}
                className="flex-1"
              >
                High Quality
              </Button>
            </div>
          </motion.div>
        )}

        {/* Account Link Input */}
        {selectedService && (
          <motion.div
            key={`link-${selectedService}`} // Optional key for animation
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="w-full max-w-md mx-auto mt-4 mb-4"
          >
            <label htmlFor="account-link" className="block mb-2 font-semibold text-foreground">
                {/* Dynamic Label Logic */}
                { selectedPlatform === 'whatsapp' && selectedService === 'Group Joins'
                    ? 'WhatsApp Group Invite Link:'
                    : selectedPlatform === 'whatsapp' && selectedService === 'Status Views'
                    ? 'Your WhatsApp Number:'
                    : `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} ${selectedService.includes('Like') || selectedService.includes('Share') || selectedService.includes('Retweet') || selectedService.includes('Comment') ? 'Post' : 'Profile/Channel'} Link:`
                }
            </label>
            <input
              id="account-link"
              type="text"
              value={accountLink}
              onChange={(e) => setAccountLink(e.target.value)}
              placeholder={`Enter the required link or number...`}
              className="w-full p-3 border rounded-md bg-card text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </motion.div>
        )}

        {/* Quantity Input and Checkout Button */}
        {accountLink && (
          <motion.div
            key={`checkout-${accountLink}`} // Optional key for animation
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="w-full max-w-md mx-auto flex flex-col items-center space-y-4 mt-6"
          >
            {/* Quantity Input */}
            <label htmlFor="quantity-input" className="font-semibold text-foreground text-lg">Choose Quantity</label>
             <input
              id="quantity-input"
              type="number"
              value={quantity}
              min={100}
              max={100000}
              step={100}
              onChange={(e) => {
                  const val = e.target.value;
                  setQuantity(val === "" ? "" : Number(val));
              }}
              className="p-3 border rounded-md bg-card text-card-foreground w-full text-center text-xl font-semibold focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., 500"
              required
            />
             <p className="text-sm text-muted-foreground">(Min: 100, Max: 100,000)</p>

            {/* Total Price Display */}
            {totalPrice > 0 && (
                 <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                    Total: Ksh {totalPrice.toFixed(2)}
                </p>
            )}

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              disabled={isCheckoutDisabled} // Use the combined disabled state
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg"
              size="lg"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : authLoading ? (
                 <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying...</span>
                 </>
              ) : !currentUser ? (
                 <>
                    <UserX className="h-5 w-5" />
                    <span>Login to Pay</span>
                 </>
              ) : (
                <>
                  <span>Proceed to Payment</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            {/* Login Prompt */}
            {authLoading === false && !currentUser && (
                <p className="text-center text-sm text-yellow-500 dark:text-yellow-400 mt-2">
                    You need to be logged in to complete the purchase.
                </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}