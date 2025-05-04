// --- START OF FILE Engagements/src/pages/EngagementPage.tsx --- (Integrated Animations)

// Import React and necessary hooks/components
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    motion,
    useSpring,
    useTransform,
    AnimatePresence // Import AnimatePresence
} from "framer-motion";
import {
  Instagram, Facebook, Youtube, ArrowRight, Loader2, UserCheck, UserX,
  Twitter as XIcon, // Twitter/X Icon
  Heart, ThumbsUp // Icons for animation
} from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "@/styles/emojiBackground.css"; // Assuming correct path
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/contexts/AuthContext'; // Import apiClient

// --- Types & Constants ---
type PlatformId = "tiktok" | "instagram" | "facebook" | "youtube" | "telegram" | "whatsapp" | "x";
type Quality = "standard" | "high";
type PricingStructure = Record<PlatformId, Record<Quality, Record<string, number>>>;
const PRICING: PricingStructure = {
  tiktok:    { standard: { followers: 0.50, likes: 0.07, views: 0.04 },         high: { followers: 0.6095, likes: 0.09, views: 0.05 } },
  instagram: { standard: { followers: 0.50, likes: 0.06, videoviews: 0.01 },          high: { followers: 0.5977, likes: 0.08, videoviews: 0.02 } },
  facebook:  { standard: { pagefollowers: 0.29, profilefollowers: 0.33, pagelikesandfollowers :0.47, postlikes: 0.25, videoreelviews: 0.04 },
                 high: { pagefollowers: 0.31, profilefollowers: 0.44, pagelikesandfollowers :0.48, postlikes: 0.26, videoreelviews: 0.06 } },
  youtube:   { standard: { subscribers: 0.99, likes: 0.10, views: 0.27 },        high: { subscribers: 1.23, likes: 0.27, views: 0.32 } },
  telegram:  { standard: { members: 0.24, postviews: 0.02, postreactions: 0.06 }, high: { members: 0.46, postviews: 0.04, postreactions: 0.07 } },
  whatsapp:  { standard: { channelmembers: 0.56, emojireactions: 0.28 },       high: { channelmembers: 1.72, emojireactions: 0.55 } },
  x:         { standard: { followers: 1.73, likes: 0.42, retweets: 0.2 },       high: { followers: 1.74, likes: 0.46, retweets: 0.3 } },
};

const platformServices: Record<PlatformId, string[]> = {
  tiktok:    ["Followers", "Likes", "Views"],
  instagram: ["Followers", "Likes", "Video Views"],
  facebook:  ["Page Followers", "Profile Followers","Page Likes And Followers", "Post Likes", "Video Reel Views"],
  youtube:   ["Subscribers", "Likes", "Views"],
  telegram:  ["Members", "Post Views", "Post Reactions"],
  whatsapp:  ["Channel Members", "Emoji Reactions"],
  x:         ["Followers", "Likes", "Retweets"],
};
const platforms: { id: PlatformId; name: string; icon: JSX.Element; color: string }[] = [
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

// --- START: AnimatedCounter Component Definition ---
interface AnimatedCounterProps {
  value: number;
}
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());
  const valueRef = useRef(value);

  useEffect(() => {
    if (value !== valueRef.current) {
        spring.set(value);
        valueRef.current = value;
    }
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
};
// --- END: AnimatedCounter Component Definition ---

// --- START: FloatingIcons Component Definition ---
interface FloatingIconsProps {
  trigger: number;
  count?: number;
  iconType?: 'heart' | 'like';
}
const FloatingIcons: React.FC<FloatingIconsProps> = ({ trigger, count = 5, iconType = 'like' }) => {
  const icons = Array.from({ length: count });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-60"> {/* Reduced opacity */}
      <AnimatePresence>
        {trigger > 0 && icons.map((_, index) => (
          <motion.div
            key={`${trigger}-${index}`}
            className={`absolute text-${iconType === 'heart' ? 'red' : 'blue'}-500`} // Dynamic color
            style={{
              left: `${40 + Math.random() * 20}%`, // Random horizontal start
              bottom: `${5 + Math.random() * 10}%`, // Random vertical start
              fontSize: `${1 + Math.random() * 0.5}rem`, // Random size
            }}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 0],
              y: -100 - Math.random() * 50, // Vary upward distance
              x: Math.random() * 60 - 30, // Wider horizontal drift
              scale: [0.5, 1.1, 0.5],
              rotate: Math.random() * 50 - 25,
            }}
            exit={{ opacity: 0, scale: 0, y: -120 }} // Ensure exit animation completes upward
            transition={{
              duration: 1.5 + Math.random() * 1, // Slightly varied duration
              delay: index * 0.08, // Slightly increased stagger
              ease: 'easeOut',
            }}
          >
            {iconType === 'heart' ? <Heart fill="currentColor" /> : <ThumbsUp fill="currentColor" />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
// --- END: FloatingIcons Component Definition ---


// --- START: EngagementPage Component ---
export default function EngagementPage() {
  const { currentUser, loading: authLoading } = useAuth();

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | "">("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<Quality>("standard");
  const [accountLink, setAccountLink] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // State for animations
  const [animateTrigger, setAnimateTrigger] = useState(0);
  const [iconType, setIconType] = useState<'heart' | 'like'>('like');


  // Derived state
  const generateServiceKey = useCallback((serviceName: string): string | null => {
      if (!serviceName) return null;
      return serviceName.toLowerCase().replace(/\s+/g, '');
  }, []);

  const serviceKey = useMemo(() => generateServiceKey(selectedService), [selectedService, generateServiceKey]);

  const totalPrice = useMemo(() => {
    let calculatedBasePrice = 0;
    if (selectedPlatform && serviceKey && PRICING[selectedPlatform as PlatformId]?.[selectedQuality]?.[serviceKey]) {
         calculatedBasePrice = PRICING[selectedPlatform as PlatformId][selectedQuality][serviceKey];
    }
    const numericQuantity = Number(quantity);
    const calculatedTotalPrice = numericQuantity >= MIN_QUANTITY ? numericQuantity * calculatedBasePrice : 0;
    // Round to 2 decimal places to avoid floating point issues
     return Math.round(calculatedTotalPrice * 100) / 100;
  }, [selectedPlatform, serviceKey, selectedQuality, quantity]);

  const currentPlatformServices = useMemo(() => {
      return selectedPlatform ? platformServices[selectedPlatform as PlatformId] ?? [] : [];
  }, [selectedPlatform]);

  // Effect to reset selections when platform changes
  useEffect(() => {
    setSelectedService("");
    setAccountLink("");
    setQuantity("");
    setSelectedQuality("standard");
  }, [selectedPlatform]);

  // Effect to trigger animations when valid quantity/service changes
  useEffect(() => {
    const numericQuantity = Number(quantity);
    if (selectedService && numericQuantity >= MIN_QUANTITY) {
      if (selectedService.toLowerCase().includes('like') || selectedService.toLowerCase().includes('reaction')) {
        setIconType('heart');
      } else {
        setIconType('like');
      }
      // Increment trigger only if quantity or service actually results in a valid price/scenario
       if(totalPrice > 0) {
            setAnimateTrigger(prev => prev + 1);
       }
    }
  // Add totalPrice dependency to re-trigger if price becomes valid
  }, [selectedService, quantity, totalPrice]);


  // Checkout Handler
  const handleCheckout = async () => {
    // Validation Checks (keep as before)
    if (authLoading) { toast.error("Verifying user session..."); return; }
    if (!currentUser) { toast.error("Please log in to proceed."); return; }
    if (!selectedPlatform || !selectedService || !accountLink) { toast.error("Please complete all selections."); return; }
    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || numericQuantity < MIN_QUANTITY || numericQuantity > MAX_QUANTITY) { toast.error(`Invalid quantity (Min: ${MIN_QUANTITY}, Max: ${MAX_QUANTITY}).`); return; }
    // Use the memoized totalPrice for check
    if (totalPrice <= 0) { toast.error("Calculated price is zero or invalid. Check selections."); return; }


    setIsCheckingOut(true);
    const loadingToastId = toast.loading("Initiating checkout...");

    try {
      const orderDetails = {
        platform: selectedPlatform, service: selectedService, quality: selectedQuality,
        accountLink: accountLink, quantity: numericQuantity,
        currency: 'KES', callbackUrl: `${window.location.origin}/payment-callback`,
      };
      console.log("Sending order details to /orders/initiate:", orderDetails);

      const response = await apiClient.post<{ redirectUrl?: string; message?: string }>(
          '/orders/initiate', orderDetails
      );

      toast.dismiss(loadingToastId);

      if (response.data.redirectUrl) {
          console.log("Redirecting to Pesapal:", response.data.redirectUrl);
          toast.success("Redirecting to payment gateway...");
          window.location.href = response.data.redirectUrl;
      } else {
          throw new Error(response.data.message || "Payment initiation failed: No redirect URL received.");
      }

    } catch (error: any) {
      toast.dismiss(loadingToastId);
      console.error("Checkout Error:", error);
      const message = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Checkout failed. Please try again.';
      toast.error(`Checkout failed: ${message}`);
      setIsCheckingOut(false);
    }
  };

  const isCheckoutDisabled = isCheckingOut || authLoading || !currentUser || totalPrice <= 0 || !quantity || Number(quantity) < MIN_QUANTITY || Number(quantity) > MAX_QUANTITY || !selectedPlatform || !selectedService || !accountLink;

  // --- JSX ---
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative overflow-hidden min-h-screen">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10" // Keep form content above background animations if any
      >
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 text-foreground tracking-tight">
            Boost Your Social Presence
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Select your platform, choose a service, and watch your engagement grow instantly.
          </p>
          <div className="mt-5 text-sm">
             {/* Auth Status Display */}
             {authLoading ? ( <span className="flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Checking session...</span> )
             : currentUser ? ( <span className="flex items-center justify-center text-green-600 dark:text-green-400"><UserCheck className="h-4 w-4 mr-1" /> Logged in as {currentUser.displayName || currentUser.email}</span> )
             : ( <span className="flex items-center justify-center text-red-600 dark:text-red-400"><UserX className="h-4 w-4 mr-1" /> Please Log In</span> )}
          </div>
        </div>

        {/* Platform Selection */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
          {platforms.map((platform) => (
            <Button key={platform.id} variant={selectedPlatform === platform.id ? "default" : "outline"} size="lg"
              onClick={() => setSelectedPlatform(platform.id)}
              className={`flex items-center space-x-2 transition-all duration-200 ease-in-out transform hover:scale-105 rounded-full px-5 py-2.5 ${selectedPlatform === platform.id ? 'ring-2 ring-offset-2 ring-primary ring-offset-background shadow-lg' : 'hover:bg-accent'}`}
            >
              <span className={`p-1.5 rounded-full ${platform.color} text-white flex items-center justify-center`}> {platform.icon} </span>
              <span className="text-sm md:text-base font-medium">{platform.name}</span>
            </Button>
          ))}
        </div>

        {/* Dynamic Form Area */}
        <div className="w-full max-w-lg mx-auto bg-card p-6 sm:p-8 rounded-xl shadow-xl border relative overflow-hidden">
            {/* Floating Icons - Rendered inside the card, behind controls */}
            <FloatingIcons trigger={animateTrigger} iconType={iconType} count={7} /> {/* Increased count */}

            {/* Service Selection */}
            {selectedPlatform && (
            <motion.div key={`service-${selectedPlatform}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-5 relative z-10"> {/* Ensure controls are above icons */}
                <label htmlFor="service-select" className="block mb-2 text-sm font-medium text-foreground">Select Service</label>
                <select id="service-select" value={selectedService} onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full p-3 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-base" required
                >
                    <option value="" disabled>-- Choose a Service --</option>
                    {currentPlatformServices.map((service) => ( <option key={service} value={service}> {service} </option> ))}
                </select>
            </motion.div>
            )}

            {/* Quality Selection */}
            {selectedService && (
            <motion.div key={`quality-${selectedService}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="mb-5 relative z-10">
                <label className="block mb-2 text-sm font-medium text-foreground">Select Quality</label>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant={selectedQuality === "standard" ? "secondary" : "outline"} onClick={() => setSelectedQuality("standard")} className="w-full py-3" size="lg">Standard</Button>
                    <Button variant={selectedQuality === "high" ? "secondary" : "outline"} onClick={() => setSelectedQuality("high")} className="w-full py-3" size="lg">High Quality</Button>
                </div>
            </motion.div>
            )}

            {/* Account Link Input */}
            {selectedService && (
            <motion.div key={`link-${selectedService}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="mb-5 relative z-10">
                <label htmlFor="account-link" className="block mb-2 text-sm font-medium text-foreground">
                 {/* Dynamic Label Logic */}
                 { /* ... keep label logic ... */ }
                 { selectedPlatform === 'whatsapp' && selectedService === 'Channel Members' ? 'WhatsApp Channel Invite Link:' : selectedPlatform === 'youtube' && selectedService === 'Subscribers' ? 'YouTube Channel Link:' : `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} ${selectedService.includes('Like') || selectedService.includes('View') || selectedService.includes('Retweet') || selectedService.includes('Reaction') || selectedService.includes('Share') ? 'Post/Video/Reel' : 'Profile/Page/Channel'} Link/URL:` }
                </label>
                <input id="account-link" type="text" value={accountLink} onChange={(e) => setAccountLink(e.target.value)} placeholder="e.g., https://www.instagram.com/username/"
                    className="w-full p-3 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-base" required
                />
            </motion.div>
            )}

            {/* Quantity & Checkout */}
            {accountLink && (
            <motion.div key={`checkout-${accountLink}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="mt-6 relative z-10">
                <label htmlFor="quantity-input" className="block mb-2 text-sm font-medium text-foreground">Enter Quantity</label>
                <input id="quantity-input" type="number" value={quantity} min={MIN_QUANTITY} max={MAX_QUANTITY} step={50}
                    onChange={(e) => { const val = e.target.value; setQuantity(val === "" ? "" : Number(val)); }}
                    className="w-full p-3 border rounded-md bg-background text-foreground text-center text-xl font-semibold focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={`e.g., ${MIN_QUANTITY * 5}`} required
                />
                <p className="text-xs text-muted-foreground text-center mt-1">(Min: {MIN_QUANTITY}, Max: {MAX_QUANTITY})</p>

                {/* Total Price Display with Animated Counter */}
                <div className="text-center my-5">
                     <span className="text-muted-foreground">Estimated Total: </span>
                     <span className="text-3xl font-bold text-primary">
                        KES <AnimatedCounter value={totalPrice} /> {/* Use AnimatedCounter */}
                    </span>
                </div>

                {/* Checkout Button */}
                <Button onClick={handleCheckout} disabled={isCheckoutDisabled} size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg"
                >
                     {/* Button Text Logic */}
                     {isCheckingOut ? (<><Loader2 className="h-5 w-5 animate-spin" /><span>Processing...</span></>)
                     : authLoading ? (<><Loader2 className="h-5 w-5 animate-spin" /><span>Verifying...</span></>)
                     : !currentUser ? (<><UserX className="h-5 w-5" /><span>Login to Pay</span></>)
                     : (<><ArrowRight className="h-5 w-5" /><span>Proceed to Payment</span></>)}
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
// --- END: EngagementPage Component ---