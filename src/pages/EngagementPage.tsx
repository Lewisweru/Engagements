import { useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Twitter, Facebook, Youtube, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import toast from "react-hot-toast";

interface EngagementService {
  id: string;
  platform: string;
  type: string;
  delivery: string;
  quality: "Standard" | "Premium" | "Ultra";
}

const BASE_PRICE_PER_UNIT = 0.50; // Ksh 0.50 per 1 follower/like/view

const allServices: EngagementService[] = [
  { id: "ig-followers", platform: "instagram", type: "followers", delivery: "10 -20 Minutes", quality: "Standard" },
  { id: "ig-likes", platform: "instagram", type: "likes", delivery: "10 - 20 Minutes", quality: "Premium" },
  { id: "ig-comments", platform: "instagram", type: "comments", delivery: "10 - 20 Minutes", quality: "Ultra" },
  { id: "yt-views", platform: "youtube", type: "views", delivery: "10 - 20 Minutes", quality: "Premium" },
  { id: "tt-followers", platform: "tiktok", type: "followers", delivery: "10 - 20 Minutes", quality: "Premium" },
  { id: "tt-likes", platform: "tiktok", type: "likes", delivery: "10 - 20 Minutes", quality: "Standard" },
];

export default function EngagementPage() {
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [selectedType, setSelectedType] = useState("followers");
  const [quantity, setQuantity] = useState(1000);
  const addToCart = useCartStore((state) => state.addItem);

  const platforms = [
    { id: "instagram", name: "Instagram", icon: <Instagram className="h-5 w-5" />, color: "bg-pink-500" },
    { id: "tiktok", name: "TikTok", icon: <TrendingUp className="h-5 w-5" />, color: "bg-black" },
    { id: "facebook", name: "Facebook", icon: <Facebook className="h-5 w-5" />, color: "bg-blue-600" },
    { id: "youtube", name: "YouTube", icon: <Youtube className="h-5 w-5" />, color: "bg-red-600" },
    { id: "twitter", name: "Twitter", icon: <Twitter className="h-5 w-5" />, color: "bg-blue-400" },
  ];

  const selectedService = allServices.find((s) => s.platform === selectedPlatform && s.type === selectedType);
  const totalPrice = quantity * BASE_PRICE_PER_UNIT; // ✅ Calculate price dynamically

  const handleAddToCart = () => {
    if (!selectedService) return;
    addToCart({ ...selectedService, quantity, price: totalPrice });
    toast.success("Added to cart!");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Social Media Engagement Services</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Boost your social media presence with our high-quality engagement services.
          </p>
        </div>

        {/* Platform Selection */}
        <div className="flex justify-center space-x-4 overflow-x-auto pb-4">
          {platforms.map((platform) => (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? "default" : "outline"}
              onClick={() => setSelectedPlatform(platform.id)}
              className="flex items-center space-x-2"
            >
              <span className={`p-1 rounded-md ${platform.color}`}>{platform.icon}</span>
              <span>{platform.name}</span>
            </Button>
          ))}
        </div>

        {/* Engagement Type Selection */}
        <div className="flex justify-center space-x-4">
          {allServices
            .filter((s) => s.platform === selectedPlatform)
            .map((service) => (
              <Button
                key={service.id}
                variant={selectedType === service.type ? "default" : "outline"}
                onClick={() => setSelectedType(service.type)}
                className="flex items-center space-x-2"
              >
                <span className="capitalize">{service.type}</span>
              </Button>
            ))}
        </div>

        {/* Quantity Selection */}
        <div className="flex flex-col items-center space-y-4">
          <label className="text-lg font-medium">Choose Quantity</label>
          <input
            type="number"
            value={quantity}
            min={100}
            step={100}
            className="p-2 rounded-lg bg-gray-800 border border-gray-600 w-48 text-center"
            onChange={(e) => setQuantity(Math.max(100, Number(e.target.value)))}
          />
          <p className="text-lg font-bold text-green-400">Total: Ksh {totalPrice.toFixed(2)}</p>
        </div>

        {/* Service Card */}
        {selectedService && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.02 }} className="bg-gray-900 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold capitalize">
                {quantity.toLocaleString()} {selectedType}
              </h3>
              <span className="text-2xl font-bold">Ksh {totalPrice.toFixed(2)}</span>
            </div>
            <p className="text-muted-foreground">{selectedService.delivery} Delivery</p>
            <p className="text-muted-foreground">{selectedService.quality} Quality</p>
            <Button className="w-full mt-4" size="lg" onClick={handleAddToCart}>
              Add to Cart
            </Button>
          </motion.div>
        )}

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-card rounded-lg"><h4 className="font-semibold">Secure Payment</h4><p className="text-sm text-muted-foreground">SSL Protected</p></div>
            <div className="p-4 bg-card rounded-lg"><h4 className="font-semibold">24/7 Support</h4><p className="text-sm text-muted-foreground">Always Available</p></div>
            <div className="p-4 bg-card rounded-lg"><h4 className="font-semibold">Money Back</h4><p className="text-sm text-muted-foreground">30 Day Guarantee</p></div>
            <div className="p-4 bg-card rounded-lg"><h4 className="font-semibold">Fast Delivery</h4><p className="text-sm text-muted-foreground">Quick Results</p></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
