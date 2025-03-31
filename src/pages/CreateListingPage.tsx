import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Instagram, Youtube, Facebook, Twitter, TrendingUp, PlusCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

// ✅ Available Platforms
const platforms = [
  { id: "instagram", name: "Instagram", icon: <Instagram className="h-6 w-6" />, color: "bg-pink-500" },
  { id: "youtube", name: "YouTube", icon: <Youtube className="h-6 w-6" />, color: "bg-red-500" },
  { id: "facebook", name: "Facebook", icon: <Facebook className="h-6 w-6" />, color: "bg-blue-600" },
  { id: "twitter", name: "Twitter", icon: <Twitter className="h-6 w-6" />, color: "bg-blue-400" },
  { id: "tiktok", name: "TikTok", icon: <TrendingUp className="h-6 w-6" />, color: "bg-black" },
];

// ✅ Available Niches
const niches = ["Fashion", "Tech", "Fitness", "Gaming", "Business", "Lifestyle"];

export default function CreateListing() {
  const { currentUser } = useAuth();
  const [mongoUserId, setMongoUserId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [step, setStep] = useState(0); // Track progress
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    followers: "",
    niche: "",
    price: "",
    description: "",
  });

  // ✅ Fetch MongoDB User ID
  useEffect(() => {
    const fetchUserId = async () => {
      if (currentUser) {
        try {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/${currentUser.uid}`);
          const data = await res.json();
          if (res.ok) {
            setMongoUserId(data._id);
          } else {
            toast.error("Failed to fetch user data.");
          }
        } catch (error) {
          toast.error("Error fetching user data.");
        } finally {
          setFetchingUser(false);
        }
      }
    };
    fetchUserId();
  }, [currentUser]);

  // ✅ Platform Selection
  const handleSelectPlatform = (platform: string) => {
    setSelectedPlatform(platform);
    setStep(1);
  };

  // ✅ Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Handle Listing Submission
  const handleSubmit = async () => {
    if (fetchingUser) {
      toast.error("Fetching user data, please wait...");
      return;
    }

    if (!mongoUserId) {
      toast.error("User data not found. Please try again.");
      return;
    }

    if (!selectedPlatform || !formData.username || !formData.followers || !formData.niche || !formData.price) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerId: mongoUserId, // ✅ Use MongoDB _id
        platform: selectedPlatform,
        username: formData.username,
        followers: parseInt(formData.followers),
        niche: formData.niche,
        price: parseFloat(formData.price),
        description: formData.description,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      toast.success("Listing created successfully!");
      setStep(0); // Reset form after success
      setSelectedPlatform(null);
      setFormData({ username: "", followers: "", niche: "", price: "", description: "" });
    } else {
      toast.error(data.error || "Failed to create listing.");
    }
  };

  // ✅ Reset Form (removed as it is unused)

  // ✅ Dynamic Label for Followers/Subscribers
  const getFollowersLabel = () => {
    return selectedPlatform === "youtube" ? "Subscribers" : "Followers";
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold text-center mb-6">Sell Your Social Media Account</h1>

      {/* ✅ Step 1: Select Platform */}
      {step === 0 && (
        <motion.div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {platforms.map((platform) => (
            <motion.div
              key={platform.id}
              whileHover={{ scale: 1.05 }}
              className={`p-4 text-white flex flex-col items-center rounded-lg cursor-pointer ${
                selectedPlatform === platform.id ? "ring-4 ring-green-500" : "bg-gray-800 hover:bg-gray-700"
              }`}
              onClick={() => handleSelectPlatform(platform.id)}
            >
              <div className={`p-3 rounded-full ${platform.color}`}>{platform.icon}</div>
              <span className="mt-2 font-medium">{platform.name}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ✅ Step-by-step form */}
      {step >= 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <label className="block">Username:</label>
          <input
            name="username"
            className="w-full p-2 border rounded bg-gray-800 text-white" // ✅ Added text color
            onChange={handleChange}
            value={formData.username}
          />
          <Button className="mt-3" onClick={() => setStep(2)}>Next</Button>
        </motion.div>
      )}

      {step >= 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <label className="block">{getFollowersLabel()}:</label>
          <input
            name="followers"
            type="number"
            className="w-full p-2 border rounded bg-gray-800 text-white" // ✅ Added text color
            onChange={handleChange}
            value={formData.followers}
          />
          <Button className="mt-3" onClick={() => setStep(3)}>Next</Button>
        </motion.div>
      )}

      {step >= 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <label className="block">Select Niche:</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {niches.map((niche) => (
              <label key={niche} className="flex items-center space-x-2 bg-gray-800 p-2 rounded-lg cursor-pointer">
                <input type="radio" name="niche" value={niche} onChange={handleChange} checked={formData.niche === niche} />
                <span>{niche}</span>
              </label>
            ))}
          </div>
          <Button className="mt-3" onClick={() => setStep(4)}>Next</Button>
        </motion.div>
      )}

      {step >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <label className="block">Price (Ksh):</label>
          <input
            name="price"
            type="number"
            className="w-full p-2 border rounded bg-gray-800 text-white" // ✅ Added text color
            onChange={handleChange}
            value={formData.price}
          />
          <Button className="mt-3" onClick={() => setStep(5)}>Next</Button>
        </motion.div>
      )}

      {step >= 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <Button className="w-full bg-green-500 hover:bg-green-600" onClick={handleSubmit} disabled={loading}>
            <PlusCircle className="h-5 w-5 mr-2" />
            {loading ? "Submitting..." : "Submit Listing"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}