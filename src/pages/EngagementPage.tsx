import { useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Youtube, TrendingUp, PlusCircle } from "lucide-react";
// We'll replace Twitter with X icon text
import { Twitter as XIcon } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import toast from "react-hot-toast";

/** Base price in Ksh per unit */
const BASE_PRICE_PER_UNIT = 0.50;

/** 
 * Define your service options for each platform.
 * The keys (tiktok, instagram, etc.) match the platform IDs used in `platforms`.
 */
const platformServices: Record<string, string[]> = {
  tiktok: [
    "Followers",
    "Video Likes",
    "Video Views",
    "Video Saves",
    "Video Shares",
    "Custom Comments",
    "Live Likes",
  ],
  instagram: [
    "Followers",
    "Likes",
    "Views",
    "Comments",
  ],
  facebook: [
    "Page Likes",
    "Post Likes",
    "Post Shares",
    "Comments",
    "Followers",
  ],
  telegram: [
    "Channel Members",
    "Group Members",
    "Post Views",
  ],
  x: [
    "Followers",
    "Likes",
    "Retweets",
    "Comments",
  ],
  youtube: [
    "Subscribers",
    "Likes",
    "Views",
    "Comments",
  ],
  whatsapp: [
    "Group Joins",
    "Status Views",
  ],
};

/**
 * Define service types for more granular selection (quality or specific package).
 * The key is lowercased + replaced spaces (e.g. 'Followers' => 'followers').
 */
const serviceTypes: Record<string, string[]> = {
  followers: ["Average Quality", "High Quality"],
  "video likes": ["Standard Likes", "Premium Likes"],
  "video views": ["Standard Views", "High Retention Views"],
  "video saves": ["Standard Saves"],
  "video shares": ["Standard Shares"],
  "custom comments": ["Custom Comments"],
  "live likes": ["Live Likes"],
  likes: ["Standard", "Premium"],
  views: ["Standard", "High Retention"],
  comments: ["Standard Comments", "Custom Comments"],
  "page likes": ["Standard Page Likes", "Premium Page Likes"],
  "post likes": ["Standard Post Likes", "Premium Post Likes"],
  "post shares": ["Standard Shares"],
  "channel members": ["Standard Members", "High Quality Members"],
  "group members": ["Standard Members", "High Quality Members"],
  "post views": ["Standard Views"],
  retweets: ["Standard Retweets", "Premium Retweets"],
  subscribers: ["Average Quality", "High Quality"],
  "group joins": ["Standard", "Premium"],
  "status views": ["Standard Views", "High Retention Views"],
};

export default function EngagementPage() {
  const [selectedPlatform, setSelectedPlatform] = useState("tiktok");
  const [selectedService, setSelectedService] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [accountLink, setAccountLink] = useState("");
  const [quantity, setQuantity] = useState(1000);
  
  const addToCart = useCartStore((state) => state.addItem);
  const totalPrice = quantity * BASE_PRICE_PER_UNIT;

  // Define the list of platforms with icons
  const platforms = [
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
    // Add item to cart
    addToCart({
      platform: selectedPlatform,
      service: selectedService,
      quality: selectedType,
      accountLink,
      quantity,
      price: totalPrice,
      id: "",
      type: ""
    });
    toast.success("Added to cart!");
  };

  // Get the list of services for the currently selected platform
  const currentPlatformServices = platformServices[selectedPlatform] || [];

  // If user selected a service, see if we have a type list
  // Convert the service to a key: lower + replace spaces
  const serviceKey = selectedService.toLowerCase().replace(/\s+/g, " ");
  const possibleTypes = serviceTypes[serviceKey] || [];

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
              onClick={() => {
                setSelectedPlatform(platform.id);
                // Reset other states
                setSelectedService("");
                setSelectedType("");
                setAccountLink("");
              }}
              className="flex items-center space-x-2"
            >
              <span className={`p-1 rounded-md ${platform.color}`}>{platform.icon}</span>
              <span>{platform.name}</span>
            </Button>
          ))}
        </div>

        {/* Engagement Form - Only show if the platform has defined services */}
        <div className="space-y-6">
          {/* Service Selection */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
            <label className="block mb-2 font-semibold">Select Service:</label>
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setSelectedType(""); // reset type
                setAccountLink("");
              }}
              className="w-full p-2 border rounded-md bg-gray-800"
            >
              <option value="">-- Choose a Service --</option>
              {currentPlatformServices.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Type Selection (if available) */}
          {selectedService && possibleTypes.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
              <label className="block mb-2 font-semibold">Select Type:</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setAccountLink("");
                }}
                className="w-full p-2 border rounded-md bg-gray-800"
              >
                <option value="">-- Choose a Type --</option>
                {possibleTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </motion.div>
          )}

          {/* Account Link (only if service is selected) */}
          {(selectedService && !possibleTypes.length) || selectedType ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
              <label className="block mb-2 font-semibold">
                {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Account Link:
              </label>
              <input
                type="text"
                value={accountLink}
                onChange={(e) => setAccountLink(e.target.value)}
                placeholder={`Enter your ${selectedPlatform} account/link`}
                className="w-full p-2 border rounded-md bg-gray-800"
              />
            </motion.div>
          ) : null}

          {/* Quantity + Add to Cart */}
          {accountLink && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto flex flex-col items-center space-y-4">
              <label className="font-semibold">Choose Quantity</label>
              <input
                type="number"
                value={quantity}
                min={100}
                step={100}
                onChange={(e) => setQuantity(Math.max(100, Number(e.target.value)))}
                className="p-2 border rounded-md bg-gray-800 w-full text-center"
              />
              <p className="text-lg font-bold text-green-400">Total: Ksh {totalPrice.toFixed(2)}</p>
              <Button onClick={handleAddToCart} className="w-full bg-green-500 hover:bg-green-600">
                <PlusCircle className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
