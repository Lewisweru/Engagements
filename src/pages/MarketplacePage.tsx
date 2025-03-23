import { useState } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Twitter, Youtube, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Account {
  id: string;
  platform: 'instagram' | 'twitter' | 'youtube';
  followers: number;
  price: number;
  engagement: number;
  age: string;
  niche: string;
  image: string;
}

export default function MarketplacePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [priceRange] = useState<[number, number]>([0, 1000]);

  const [accounts] = useState<Account[]>([
    {
      id: '1',
      platform: 'instagram',
      followers: 50000,
      price: 499,
      engagement: 3.5,
      age: '2 years',
      niche: 'Fashion',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=300'
    },
    {
      id: '2',
      platform: 'twitter',
      followers: 25000,
      price: 299,
      engagement: 2.8,
      age: '1.5 years',
      niche: 'Tech',
      image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&h=300'
    },
    {
      id: '3',
      platform: 'youtube',
      followers: 100000,
      price: 999,
      engagement: 4.2,
      age: '3 years',
      niche: 'Gaming',
      image: 'https://images.unsplash.com/photo-1610648927631-6c1751f89d6f?auto=format&fit=crop&w=400&h=300'
    },
  ]);

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.niche.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || account.platform === selectedPlatform;
    const matchesPrice = account.price >= priceRange[0] && account.price <= priceRange[1];
    return matchesSearch && matchesPlatform && matchesPrice;
  });

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-500" />;
      case 'twitter':
        return <Twitter className="h-5 w-5 text-blue-400" />;
      case 'youtube':
        return <Youtube className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold">Marketplace</h1>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by niche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-md border border-input bg-background"
              />
            </div>
            
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              onClick={() => {/* Toggle filter modal */}}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          </div>
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-4">
          <Button
            variant={selectedPlatform === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedPlatform('all')}
          >
            All Platforms
          </Button>
          <Button
            variant={selectedPlatform === 'instagram' ? 'default' : 'outline'}
            onClick={() => setSelectedPlatform('instagram')}
            className="flex items-center space-x-2"
          >
            <Instagram className="h-4 w-4" />
            <span>Instagram</span>
          </Button>
          <Button
            variant={selectedPlatform === 'twitter' ? 'default' : 'outline'}
            onClick={() => setSelectedPlatform('twitter')}
            className="flex items-center space-x-2"
          >
            <Twitter className="h-4 w-4" />
            <span>Twitter</span>
          </Button>
          <Button
            variant={selectedPlatform === 'youtube' ? 'default' : 'outline'}
            onClick={() => setSelectedPlatform('youtube')}
            className="flex items-center space-x-2"
          >
            <Youtube className="h-4 w-4" />
            <span>YouTube</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((account) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-lg shadow-lg overflow-hidden"
            >
              <div className="relative h-48">
                <img
                  src={account.image}
                  alt={`${account.platform} account`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg">
                    <PlatformIcon platform={account.platform} />
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold capitalize">
                      {account.platform} Account
                    </h3>
                    <p className="text-muted-foreground">
                      {account.followers.toLocaleString()} Followers
                    </p>
                  </div>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                    ${account.price}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Engagement Rate:</span>{' '}
                    {account.engagement}%
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Account Age:</span>{' '}
                    {account.age}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Niche:</span>{' '}
                    {account.niche}
                  </p>
                </div>
                
                <Button className="w-full mt-6">
                  View Details
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}