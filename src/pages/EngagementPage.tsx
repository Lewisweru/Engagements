import { useState } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Twitter, Facebook, Youtube, TrendingUp, Heart, MessageCircle, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface EngagementService {
  id: string;
  platform: 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'twitter';
  type: 'followers' | 'likes' | 'comments' | 'views';
  quantity: number;
  price: number;
  delivery: string;
  quality: 'Standard' | 'Premium' | 'Ultra';
}

interface PlatformTab {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const allServices: EngagementService[] = [
  // Instagram Services
  {
    id: 'ig-followers-1',
    platform: 'instagram',
    type: 'followers',
    quantity: 1000,
    price: 9.99,
    delivery: '1-2 days',
    quality: 'Standard'
  },
  {
    id: 'ig-likes-1',
    platform: 'instagram',
    type: 'likes',
    quantity: 500,
    price: 4.99,
    delivery: '24 hours',
    quality: 'Premium'
  },
  {
    id: 'ig-comments-1',
    platform: 'instagram',
    type: 'comments',
    quantity: 100,
    price: 19.99,
    delivery: '2-3 days',
    quality: 'Ultra'
  },
  // YouTube Services
  {
    id: 'yt-views-1',
    platform: 'youtube',
    type: 'views',
    quantity: 5000,
    price: 24.99,
    delivery: '3-4 days',
    quality: 'Premium'
  },
  {
    id: 'yt-subscribers-1',
    platform: 'youtube',
    type: 'followers',
    quantity: 1000,
    price: 29.99,
    delivery: '4-5 days',
    quality: 'Ultra'
  },
  {
    id: 'yt-likes-1',
    platform: 'youtube',
    type: 'likes',
    quantity: 2000,
    price: 14.99,
    delivery: '1-2 days',
    quality: 'Standard'
  },
  // TikTok Services
  {
    id: 'tt-followers-1',
    platform: 'tiktok',
    type: 'followers',
    quantity: 2000,
    price: 19.99,
    delivery: '2-3 days',
    quality: 'Premium'
  },
  {
    id: 'tt-likes-1',
    platform: 'tiktok',
    type: 'likes',
    quantity: 3000,
    price: 9.99,
    delivery: '1 day',
    quality: 'Standard'
  },
  {
    id: 'tt-views-1',
    platform: 'tiktok',
    type: 'views',
    quantity: 10000,
    price: 14.99,
    delivery: '1-2 days',
    quality: 'Premium'
  }
];

export default function EngagementPage() {
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [selectedType, setSelectedType] = useState('followers');
  const addToCart = useCartStore((state) => state.addItem);

  const platforms: PlatformTab[] = [
    { id: 'instagram', name: 'Instagram', icon: <Instagram className="h-5 w-5" />, color: 'bg-pink-500' },
    { id: 'tiktok', name: 'TikTok', icon: <TrendingUp className="h-5 w-5" />, color: 'bg-black' },
    { id: 'facebook', name: 'Facebook', icon: <Facebook className="h-5 w-5" />, color: 'bg-blue-600' },
    { id: 'youtube', name: 'YouTube', icon: <Youtube className="h-5 w-5" />, color: 'bg-red-600' },
    { id: 'twitter', name: 'Twitter', icon: <Twitter className="h-5 w-5" />, color: 'bg-blue-400' },
  ];

  const filteredServices = allServices.filter(
    service => service.platform === selectedPlatform && service.type === selectedType
  );

  const availableTypes = [...new Set(
    allServices
      .filter(service => service.platform === selectedPlatform)
      .map(service => service.type)
  )];

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'followers':
        return <Users className="h-5 w-5" />;
      case 'likes':
        return <Heart className="h-5 w-5" />;
      case 'comments':
        return <MessageCircle className="h-5 w-5" />;
      case 'views':
        return <Eye className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const handleAddToCart = (service: EngagementService) => {
    addToCart(service);
    toast.success('Added to cart!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Social Media Engagement Services</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Boost your social media presence with our high-quality engagement services.
            Choose from various platforms and engagement types.
          </p>
        </div>

        {/* Platform Selection */}
        <div className="flex justify-center space-x-4 overflow-x-auto pb-4">
          {platforms.map((platform) => (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? 'default' : 'outline'}
              onClick={() => {
                setSelectedPlatform(platform.id);
                setSelectedType(availableTypes[0]);
              }}
              className="flex items-center space-x-2"
            >
              <span className={`p-1 rounded-md ${platform.color}`}>
                {platform.icon}
              </span>
              <span>{platform.name}</span>
            </Button>
          ))}
        </div>

        {/* Service Type Selection */}
        <div className="flex justify-center space-x-4">
          {availableTypes.map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              onClick={() => setSelectedType(type)}
              className="flex items-center space-x-2"
            >
              {getServiceIcon(type)}
              <span className="capitalize">{type}</span>
            </Button>
          ))}
        </div>

        {/* Service Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-lg shadow-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${
                      service.quality === 'Ultra' ? 'bg-purple-500' :
                      service.quality === 'Premium' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}>
                      {getServiceIcon(service.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold capitalize">
                        {service.quantity.toLocaleString()} {service.type}
                      </h3>
                      <p className="text-sm text-muted-foreground">{service.quality} Quality</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">${service.price}</span>
                </div>

                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <ul className="space-y-2">
                      <li>✓ High Quality {service.type}</li>
                      <li>✓ {service.delivery} Delivery</li>
                      <li>✓ No Password Required</li>
                      <li>✓ 24/7 Support</li>
                    </ul>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => handleAddToCart(service)}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-card rounded-lg">
              <h4 className="font-semibold">Secure Payment</h4>
              <p className="text-sm text-muted-foreground">SSL Protected</p>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <h4 className="font-semibold">24/7 Support</h4>
              <p className="text-sm text-muted-foreground">Always Available</p>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <h4 className="font-semibold">Money Back</h4>
              <p className="text-sm text-muted-foreground">30 Day Guarantee</p>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <h4 className="font-semibold">Fast Delivery</h4>
              <p className="text-sm text-muted-foreground">Quick Results</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}