import { useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Youtube, TrendingUp, PlusCircle } from "lucide-react";
import { Twitter as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import toast from "react-hot-toast";
import "@/styles/emojiBackground.css"; // Import the emoji background styles

/** Pricing structure */
const PRICING = {
  standard: {
    followers: 0.5,
    likes: 0.5,
    views: 0.4,
    subscribers: 1.0,
    watchhours: 2.0,
    members: 0.6,
    statusviews: 0.3,
    retweets: 0.6,
    comments: 0.7,
  },
  high: {
    followers: 0.55,
    likes: 0.55,
    views: 0.45,
    subscribers: 1.2,
    watchhours: 2.5,
    members: 0.7,
    statusviews: 0.35,
    retweets: 0.7,
    comments: 0.8,
  },
};

const platformServices = {
  tiktok: ["Followers", "Video Likes", "Video Views"],
  instagram: ["Followers", "Likes", "Views"],
  facebook: ["Page Likes", "Post Likes", "Post Shares"],
  youtube: ["Subscribers", "Likes", "Views", "Watch Hours"],
  telegram: ["Channel Members", "Group Members", "Post Views"],
  whatsapp: ["Group Joins", "Status Views"],
  x: ["Followers", "Likes", "Retweets", "Comments"],
};

export default function EngagementPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformServices | "">("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<"standard" | "high">("standard");
  const [accountLink, setAccountLink] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const addToCart = useCartStore((state) => state.addItem);

  // Calculate total price dynamically
  const basePrice =
    selectedService.toLowerCase() in PRICING[selectedQuality]
      ? PRICING[selectedQuality][selectedService.toLowerCase() as keyof typeof PRICING.standard]
      : 0;
  const totalPrice = quantity && quantity >= 100 ? quantity * basePrice : 0;

  const platforms: { id: keyof typeof platformServices; name: string; icon: JSX.Element; color: string }[] = [
    { id: "tiktok", name: "TikTok", icon: <TrendingUp className="h-5 w-5" />, color: "bg-black" },
    { id: "instagram", name: "Instagram", icon: <Instagram className="h-5 w-5" />, color: "bg-pink-500" },
    { id: "facebook", name: "Facebook", icon: <Facebook className="h-5 w-5" />, color: "bg-blue-600" },
    { id: "youtube", name: "YouTube", icon: <Youtube className="h-5 w-5" />, color: "bg-red-600" },
    { id: "telegram", name: "Telegram", icon: <TrendingUp className="h-5 w-5 rotate-45" />, color: "bg-blue-400" },
    { id: "whatsapp", name: "WhatsApp", icon: <TrendingUp className="h-5 w-5 rotate-180" />, color: "bg-green-500" },
    { id: "x", name: "Twitter (X)", icon: <XIcon className="h-5 w-5" />, color: "bg-gray-700" },
  ];

  const handleAddToCart = () => {
    if (!selectedService || !accountLink || !quantity || quantity < 100 || quantity > 100000) {
      toast.error("Invalid quantity. Minimum is 100 and maximum is 100,000.");
      return;
    }
    addToCart({
      platform: selectedPlatform,
      service: selectedService,
      quality: selectedQuality,
      accountLink,
      quantity,
      price: totalPrice,
      id: "",
      type: "",
    });
    toast.success("Added to cart!");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative overflow-hidden">
      {/* Emoji Background */}
      <div className="emoji-background"></div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-100">Social Media Engagement Services</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-gray-300">
            Boost your social media presence with our high-quality engagement services.
          </p>
        </div>

        {/* Platform Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pb-4">
          {platforms.map((platform) => (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? "default" : "outline"}
              onClick={() => {
                setSelectedPlatform(platform.id);
                setSelectedService("");
                setAccountLink("");
                setQuantity("");
              }}
              className="flex items-center space-x-2 px-4 py-2"
            >
              <span className={`p-1 rounded-md ${platform.color}`}>{platform.icon}</span>
              <span className="text-sm md:text-base">{platform.name}</span>
            </Button>
          ))}
        </div>

        {/* Service Selection */}
        {selectedPlatform && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
            <label className="block mb-2 font-semibold text-gray-300">Select Service:</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full p-2 border rounded-md bg-gray-800 text-white"
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

        {/* Quality Selection */}
        {selectedService && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto mt-4">
            <label className="block mb-2 font-semibold text-gray-300">Select Quality:</label>
            <div className="flex space-x-4">
              <Button
                variant={selectedQuality === "standard" ? "default" : "outline"}
                onClick={() => setSelectedQuality("standard")}
              >
                Standard Quality
              </Button>
              <Button
                variant={selectedQuality === "high" ? "default" : "outline"}
                onClick={() => setSelectedQuality("high")}
              >
                High Quality
              </Button>
            </div>
          </motion.div>
        )}

        {/* Account Link Input */}
        {selectedService && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto mt-4">
            <label className="block mb-2 font-semibold text-gray-300">Account Link:</label>
            <input
              type="text"
              value={accountLink}
              onChange={(e) => setAccountLink(e.target.value)}
              placeholder={`Enter your ${selectedPlatform} account/link`}
              className="w-full p-2 border rounded-md bg-gray-800 text-white"
            />
          </motion.div>
        )}

        {/* Quantity and Add to Cart */}
        {accountLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md mx-auto flex flex-col items-center space-y-4 mt-4"
          >
            <label className="font-semibold text-gray-300">Choose Quantity</label>
            <input
              type="number"
              value={quantity}
              min={100}
              max={100000}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="p-2 border rounded-md bg-gray-800 w-full text-center text-white"
            />
            <p className="text-lg font-bold text-green-400">Total: Ksh {totalPrice.toFixed(2)}</p>
            <Button onClick={handleAddToCart} className="w-full bg-green-500 hover:bg-green-600">
              <PlusCircle className="h-5 w-5 mr-2" /> Add to Cart
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
