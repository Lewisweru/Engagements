import React from 'react'; // Import React
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button'; // Ensure path is correct
import { useNavigate } from 'react-router-dom';
import { Instagram, Twitter, Youtube, Facebook, Linkedin, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Ensure path is correct
import toast from 'react-hot-toast';

// --- Embedded BackgroundAnimation Component Logic ---

const BackgroundAnimation = React.memo(() => {
    // Accessing window properties directly can be problematic for SSR.
    // It's generally fine for client-side rendering (CSR) like in typical React apps.
    // If SSR issues arise, consider using useEffect to get dimensions after mount.
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000; // Default height
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000; // Default width

    return (
        // Container for the animation, positioned behind content (z-0)
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Create multiple animated emojis */}
            {Array.from({ length: 30 }).map((_, i) => ( // Increased count slightly for potentially more density
                <motion.div
                    key={i} // Unique key for each element
                    className="absolute text-3xl opacity-50" // Base styling for the emoji
                    style={{
                        // Initial position is set via `initial` props below based on calculated x/y
                        left: 0, // Style left/top can be 0 as animation controls position
                        top: 0,
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)' // Subtle shadow for visibility
                    }}
                    initial={{
                        opacity: 0,
                        // Start below the screen at a random horizontal position
                        y: viewportHeight + Math.random() * 100 + 50,
                        x: Math.random() * viewportWidth,
                        scale: 0.5, // Start smaller
                    }}
                    animate={{
                        opacity: [0, 0.6, 0.6, 0], // Fade in, stay visible, fade out
                        // Animate vertically up and off the screen
                        y: -100, // Target Y position (off-screen top)
                        // Allow horizontal position to drift slightly or stay random based on start
                        // This keeps the x random based on the initial value
                        x: [null, Math.random() * viewportWidth * 0.8 + viewportWidth * 0.1], // Adjust range if needed
                        scale: [0.5, 1, 1, 0.5], // Pulse effect during travel
                        rotate: [0, Math.random() * 60 - 30, 0], // Reduced gentle rotation (-30deg to +30deg)
                    }}
                    transition={{
                        duration: Math.random() * 8 + 8, // Slower, varied duration (8-16s)
                        repeat: Infinity, // Loop animation forever
                        repeatDelay: 1, // Wait 1 second before repeating
                        delay: Math.random() * 8, // Staggered start time (0-8s)
                        ease: "linear", // Consistent speed for upward movement
                    }}
                >
                    {/* Randomly select between heart and thumbs-up emoji */}
                    {Math.random() > 0.5 ? '❤️' : '💌'}
                </motion.div>
            ))}
        </div>
    );
});
BackgroundAnimation.displayName = 'BackgroundAnimation'; // Add display name for DevTools

// --- End of BackgroundAnimation Logic ---


// --- HomePage Component ---
export default function HomePage() {
  const { currentUser, loading: authLoading } = useAuth(); // Get auth state
  const navigate = useNavigate(); // Get navigate function

  // Handler for the main Call To Action button
  const handleBuyClick = () => {
    if (authLoading) {
      // Show feedback if user clicks while auth state is loading
      toast("Checking login status...", { icon: '⏳' });
      return; // Prevent navigation
    }

    if (currentUser) {
      // User is logged in, navigate to the engagement page
      navigate('/engagement');
    } else {
      // User is not logged in, navigate to the authentication page
      navigate('/auth');
    }
  };

  // No need for emojiCount or emojiItems with the new BackgroundAnimation component

  return (
    // Main container: relative positioning context, overflow hidden to contain absolute children
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">

      {/* Render the BackgroundAnimation component */}
      <BackgroundAnimation />

      {/* Hero Section: positioned above the background animation (z-10) */}
      <section className="relative z-10 py-20 md:py-28 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Animated Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 text-transparent bg-clip-text mb-6 leading-tight"
            >
              Elevate Your Social Influence
            </motion.h1>
            {/* Animated Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10"
            >
              Instantly boost your reach with genuine followers, likes, and engagement across top platforms.
            </motion.p>
            {/* Animated Button Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex justify-center"
            >
              {/* Wrapper for button hover effects */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Main Call to Action Button */}
                <Button
                  size="lg"
                  onClick={handleBuyClick}
                  disabled={authLoading} // Disable while checking auth status
                  className="px-8 py-4 text-lg font-bold text-white rounded-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  {/* Show loading state or button text */}
                  {authLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Checking Status...
                    </>
                  ) : (
                     <>
                      Buy Followers & Likes 🚀
                     </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platforms Section: positioned above the background animation (z-10) */}
      <section className="relative z-10 py-16 md:py-20 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Platforms We Power Up</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-6 md:gap-8">
            {/* Platform data array */}
            {[
              { name: 'Instagram', icon: <Instagram className="h-10 w-10 md:h-12 md:w-12 text-pink-500" /> },
              { name: 'Twitter (X)', icon: <Twitter className="h-10 w-10 md:h-12 md:w-12 text-foreground" /> },
              { name: 'YouTube', icon: <Youtube className="h-10 w-10 md:h-12 md:w-12 text-red-600" /> },
              { name: 'Facebook', icon: <Facebook className="h-10 w-10 md:h-12 md:w-12 text-blue-600" /> },
              { name: 'LinkedIn', icon: <Linkedin className="h-10 w-10 md:h-12 md:w-12 text-blue-700" /> },
              { name: 'Telegram', icon: <svg className="h-10 w-10 md:h-12 md:w-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9.04 15.91 8.9 20.5c.64 0 .92-.27 1.26-.59l2.99-2.87 6.2 4.54c1.14.63 1.95.3 2.23-1.05l3.99-18.8c.37-1.7-.62-2.47-1.73-2.05L1.6 9.75c-1.64.64-1.62 1.56-.3 1.98l5.3 1.65 12.3-7.74c.58-.37 1.11-.17.68.24z"/></svg> },
              { name: 'TikTok', icon: <svg className="h-10 w-10 md:h-12 md:w-12 text-foreground" fill="currentColor" viewBox="0 0 16 16"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/></svg> },
            ].map((platform) => (
              // Individual platform card with thumping animation
              <motion.div
                key={platform.name}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-background shadow-md hover:shadow-lg transition-shadow"
                whileHover={{ y: -5 }} // Lift effect on hover
                animate={{ // Thumping animation
                    scale: [1, 1.08, 1],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut",
                    delay: Math.random() * 0.8, // Stagger animation start
                }}
              >
                <div className="mb-2">{platform.icon}</div>
                <span className="text-sm md:text-base font-medium text-muted-foreground">{platform.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section: positioned above the background animation (z-10) */}
      <section className="relative z-10 py-16 md:py-20 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Partner With Us?</h2>
          <p className="text-lg text-gray-300 mb-10 md:mb-12 max-w-3xl mx-auto">
            Experience seamless growth with reliable services, secure processing, and dedicated support.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature cards */}
            {[
              { title: 'Secure Payments', description: 'Your transactions are fully encrypted and protected.' },
              { title: 'Real Engagement', description: 'Boost your profile with genuine interactions.' },
              { title: '24/7 Support', description: 'Our expert team is always available to assist you.' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-lg bg-gray-800/60 backdrop-blur-sm border border-gray-700/50"
                 whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.3)" }} // Hover effect
                 transition={{ duration: 0.2 }}
              >
                <h3 className="text-xl font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

       {/* Footer: positioned above the background animation (z-10) */}
      <footer className="relative z-10 py-6 text-center text-muted-foreground text-sm bg-background border-t border-border">
            © {new Date().getFullYear()} YourCompanyName. All rights reserved.
      </footer>
    </div>
  );
}