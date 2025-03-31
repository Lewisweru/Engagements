import { useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Youtube, TrendingUp, PlusCircle } from "lucide-react";
import { Twitter as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import toast from "react-hot-toast";

/** Base price in Ksh per unit */
const BASE_PRICE_PER_UNIT = 0.50;

const platformServices = {
  tiktok: ["Followers", "Video Likes", "Video Views", "Video Saves", "Video Shares", "Custom Comments", "Live Likes"],
  instagram: ["Followers", "Likes", "Views", "Comments"],
  facebook: ["Page Likes", "Post Likes", "Post Shares", "Comments", "Followers"],
  telegram: ["Channel Members", "Group Members", "Post Views"],
  x: ["Followers", "Likes", "Retweets", "Comments"],
  youtube: ["Subscribers", "Likes", "Views", "Comments"],
  whatsapp: ["Group Joins", "Status Views"],
};

export default function EngagementPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformServices | "">("");
  const [selectedService, setSelectedService] = useState("");
  const [accountLink, setAccountLink] = useState("");
  const [quantity, setQuantity] = useState(100);
  const addToCart = useCartStore((state) => state.addItem);
  const totalPrice = quantity * BASE_PRICE_PER_UNIT;

  const platforms: { id: keyof typeof platformServices; name: string; icon: JSX.Element; color: string }[] = [
      { id: "tiktok", name: "TikTok", icon: <TrendingUp className="h-5 w-5" />, color: "bg-black" },
      { id: "instagram", name: "Instagram", icon: <Instagram className="h-5 w-5" />, color: "bg-pink-500" },
      { id: "facebook", name: "Facebook", icon: <Facebook className="h-5 w-5" />, color: "bg-blue-600" },
      { id: "telegram", name: "Telegram", icon: <TrendingUp className="h-5 w-5 rotate-45" />, color: "bg-blue-400" },
      { id: "x", name: "X", icon: <XIcon className="h-5 w-5" />, color: "bg-gray-700" },
      { id: "youtube", name: "YouTube", icon: <Youtube className="h-5 w-5" />, color: "bg-red-600" },
      { id: "whatsapp", name: "WhatsApp", icon: <TrendingUp className="h-5 w-5 rotate-180" />, color: "bg-green-500" },
    ];

  const handleAddToCart = () => {
    if (!selectedService || !accountLink) {
      toast.error("Please fill all required fields.");
      return;
    }
    addToCart({
      platform: selectedPlatform, service: selectedService, accountLink, quantity, price: totalPrice, id: "", type: "",
      quality: ""
    });
    toast.success("Added to cart!");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Social Media Engagement Services</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Boost your social media presence with our high-quality engagement services.</p>
        </div>

        <div className="flex justify-center space-x-4 pb-4">
          {platforms.map((platform) => (
            <Button key={platform.id} variant={selectedPlatform === platform.id ? "default" : "outline"} onClick={() => {
              setSelectedPlatform(platform.id);
              setSelectedService("");
              setAccountLink("");
            }}>
              <span className={`p-1 rounded-md ${platform.color}`}>{platform.icon}</span>
              <span>{platform.name}</span>
            </Button>
          ))}
        </div>

        {selectedPlatform && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
            <label className="block mb-2 font-semibold">Select Service:</label>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className="w-full p-2 border rounded-md bg-gray-800">
              <option value="">-- Choose a Service --</option>
              {platformServices[selectedPlatform]?.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </motion.div>
        )}

        {selectedService && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
            <label className="block mb-2 font-semibold">Account Link:</label>
            <input type="text" value={accountLink} onChange={(e) => setAccountLink(e.target.value)} placeholder={`Enter your ${selectedPlatform} account/link`} className="w-full p-2 border rounded-md bg-gray-800" />
          </motion.div>
        )}

        {accountLink && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto flex flex-col items-center space-y-4">
            <label className="font-semibold">Choose Quantity</label>
            <input type="number" value={quantity} min={100} max={100000} step={100} onChange={(e) => setQuantity(Math.max(100, Math.min(100000, Number(e.target.value))))} className="p-2 border rounded-md bg-gray-800 w-full text-center" />
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
