import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube, Facebook, Linkedin } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text mb-6"
            >
              Your Gateway to Social Media Success
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-muted-foreground mb-8"
            >
              Buy and sell social media accounts, followers, and engagement services
              with confidence.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex justify-center gap-4"
            >
              <Link to="/marketplace">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-500">
                    Browse Marketplace
                  </Button>
                </motion.div>
              </Link>
              <Link to="/auth">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Button size="lg" variant="outline">
                    Start Selling
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Supported Platforms</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: 'Instagram', icon: <Instagram className="h-12 w-12 text-pink-500 mb-2" /> },
              { name: 'Twitter', icon: <Twitter className="h-12 w-12 text-blue-400 mb-2" /> },
              { name: 'YouTube', icon: <Youtube className="h-12 w-12 text-red-500 mb-2" /> },
              { name: 'Facebook', icon: <Facebook className="h-12 w-12 text-blue-600 mb-2" /> },
              { name: 'LinkedIn', icon: <Linkedin className="h-12 w-12 text-blue-700 mb-2" /> },
            ].map((platform, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center p-6 rounded-lg bg-accent/20"
                animate={{
                  scale: [1, 1.1, 1],
                  transition: { repeat: Infinity, duration: 1.5 },
                }}
              >
                {platform.icon}
                <span className="font-semibold">{platform.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gray-900 text-white text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-6">Why Choose Us?</h2>
          <p className="text-lg mb-8">
            We offer secure transactions, real engagement, and the best marketplace
            for social media growth.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Secure Payments', description: 'Your transactions are protected.' },
              { title: 'Real Followers', description: 'No bots, only genuine engagement.' },
              { title: '24/7 Support', description: 'Our team is here to help anytime.' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-lg bg-gray-800"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Buy Engagements Button */}
      <div className="flex justify-center my-12">
        <motion.div
          whileHover={{ scale: 1.1 }}
          animate={{
            scale: [1, 1.1, 1],
            boxShadow: [
              '0px 0px 10px rgba(255, 0, 255, 0.6)',
              '0px 0px 15px rgba(0, 255, 255, 0.8)',
              '0px 0px 10px rgba(255, 0, 255, 0.6)',
            ],
            transition: { repeat: Infinity, duration: 1.5 },
          }}
        >
          <Link to="/engagements">
            <Button
              size="lg"
              className="px-8 py-4 text-lg font-bold text-white rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
            >
              Buy Followers & Likes 🚀
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
