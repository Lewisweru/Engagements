import React, { useState, useRef, useCallback } from 'react';
// Remove useSpring, useTransform from framer-motion import
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Instagram, Twitter, Youtube, Facebook, Linkedin, Loader2, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

// --- Embedded BackgroundAnimation Component Logic ---
const BackgroundAnimation = React.memo(() => {
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const emojis = ['💜', '🩷', '🔥']; // More variety

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 35 }).map((_, i) => {
                 const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                 const duration = Math.random() * 10 + 10;
                 const delay = Math.random() * 10;

                 return (
                    <motion.div
                        key={i}
                        className="absolute text-2xl opacity-40"
                        style={{ left: 0, top: 0, textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)' }}
                        initial={{ opacity: 0, y: viewportHeight + Math.random() * 100 + 50, x: Math.random() * viewportWidth, scale: 0.4 }}
                        animate={{ opacity: [0, 0.5, 0.5, 0], y: -100, x: [null, Math.random() * viewportWidth * 0.9 + viewportWidth * 0.05], scale: [0.4, 0.9, 0.9, 0.4], rotate: [0, Math.random() * 40 - 20, 0] }}
                        transition={{ duration: duration, repeat: Infinity, repeatDelay: 2, delay: delay, ease: "linear" }}
                    >
                        {emoji}
                    </motion.div>
                 );
             })}
        </div>
    );
});
BackgroundAnimation.displayName = 'BackgroundAnimation';
// --- End of BackgroundAnimation Logic ---


// --- START: FlyingHeart Component Definition ---
interface FlyingHeartProps {
  id: number;
  x: number;
  y: number;
  onComplete: (id: number) => void;
}

const FlyingHeart: React.FC<FlyingHeartProps> = React.memo(({ id, x, y, onComplete }) => {
  const duration = 0.6 + Math.random() * 0.4;
  const driftX = Math.random() * 60 - 30;
  const floatY = -80 - Math.random() * 40;

  return (
    <motion.div
      key={id}
      className="absolute z-50 pointer-events-none" // High z-index
      style={{ left: x, top: y }}
      initial={{ opacity: 1, scale: 0.3, y: 0, x: 0 }}
      animate={{ opacity: 0, scale: 1, y: floatY, x: driftX }}
      exit={{ opacity: 0, scale: 0 }} // Optional exit animation
      transition={{ duration: duration, ease: "easeOut" }}
      onAnimationComplete={() => onComplete(id)}
    >
      <Heart className="text-red-500" fill="currentColor" size={24 + Math.random() * 16} />
    </motion.div>
  );
});
FlyingHeart.displayName = 'FlyingHeart';
// --- END: FlyingHeart Component Definition ---


// --- Animation Variants ---
const slideUpVariant = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};
const staggerContainerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
};
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};


// --- HomePage Component ---
export default function HomePage() {
  const { currentUser, loading: authLoading, loadingAppUser } = useAuth();
  const navigate = useNavigate();

  // State for Flying Hearts
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);

  // Tap Handler
  const handleTap = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    // Ignore taps on interactive elements like buttons if needed
     if ((event.target as Element).closest('button')) {
         return;
     }

    const x = event.clientX;
    const y = event.clientY;
    const id = nextId.current++;
    const newHeart = { id, x: x - 20, y: y - 20 }; // Offset slightly

    setHearts(currentHearts => {
        const updatedHearts = [...currentHearts, newHeart];
        // Optional limit: Keep only the latest 50 hearts for performance
        if (updatedHearts.length > 50) {
           return updatedHearts.slice(updatedHearts.length - 50);
        }
        return updatedHearts;
    });
  }, []); // No dependencies needed

  // Remove Heart Callback
  const removeHeart = useCallback((idToRemove: number) => {
    setHearts(currentHearts => currentHearts.filter(heart => heart.id !== idToRemove));
  }, []);

  // Buy Button Handler
  const handleBuyClick = () => {
    if (authLoading || loadingAppUser) {
      toast("Checking login status...", { icon: '⏳' });
      return;
    }
    if (currentUser) { navigate('/engagement'); }
    else { navigate('/auth'); }
  };
  const isCheckingStatus = authLoading || loadingAppUser;

  return (
    // Main container with tap listener
    <div
      className="min-h-screen bg-background text-foreground relative overflow-hidden"
      onPointerDown={handleTap} // Attach tap listener here
      style={{ cursor: 'default' }} // Use default cursor, interaction is visual feedback
    >
      {/* Background Animation */}
      <BackgroundAnimation />

       {/* Render Flying Hearts */}
       <AnimatePresence>
         {hearts.map(heart => (
           <FlyingHeart
             key={heart.id} id={heart.id} x={heart.x} y={heart.y} onComplete={removeHeart}
           />
         ))}
       </AnimatePresence>

      {/* Hero Section */}
      <section className="relative z-10 py-20 md:py-28 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 text-transparent bg-clip-text mb-6 leading-tight"
            >
              Elevate Your Social Influence
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10"
            >
              Instantly boost your reach with genuine followers, likes, and engagement across top platforms.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
              className="flex justify-center"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" onClick={handleBuyClick} disabled={isCheckingStatus}
                  className="px-8 py-4 text-lg font-bold text-white rounded-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  {isCheckingStatus ? (<><Loader2 className="h-5 w-5 animate-spin" /> Checking Status...</>) : (<>Get Started Now 🚀</>)}
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platforms Section */}
       <motion.section
        className="relative z-10 py-16 md:py-20 bg-secondary/20"
        variants={slideUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <motion.h2 variants={itemVariant} className="text-3xl font-bold text-center mb-12">
             Platforms We Power Up
           </motion.h2>
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-6 md:gap-8" variants={staggerContainerVariant}>
            {[ /* Platform data array */
              { name: 'Instagram', icon: <Instagram className="h-10 w-10 md:h-12 md:w-12 text-pink-500" /> },
              { name: 'Twitter (X)', icon: <Twitter className="h-10 w-10 md:h-12 md:w-12 text-foreground" /> },
              { name: 'YouTube', icon: <Youtube className="h-10 w-10 md:h-12 md:w-12 text-red-600" /> },
              { name: 'Facebook', icon: <Facebook className="h-10 w-10 md:h-12 md:w-12 text-blue-600" /> },
              { name: 'LinkedIn', icon: <Linkedin className="h-10 w-10 md:h-12 md:w-12 text-blue-700" /> },
              { name: 'Telegram', icon: <svg className="h-10 w-10 md:h-12 md:w-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9.04 15.91 8.9 20.5c.64 0 .92-.27 1.26-.59l2.99-2.87 6.2 4.54c1.14.63 1.95.3 2.23-1.05l3.99-18.8c.37-1.7-.62-2.47-1.73-2.05L1.6 9.75c-1.64.64-1.62 1.56-.3 1.98l5.3 1.65 12.3-7.74c.58-.37 1.11-.17.68.24z"/></svg> },
              { name: 'TikTok', icon: <svg className="h-10 w-10 md:h-12 md:w-12 text-foreground" fill="currentColor" viewBox="0 0 16 16"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/></svg> },
            ].map((platform) => (
              <motion.div key={platform.name} className="flex flex-col items-center justify-center p-4 rounded-lg bg-background shadow-md hover:shadow-lg transition-shadow" variants={itemVariant} whileHover={{ y: -5 }}>
                <div className="mb-2">{platform.icon}</div>
                <span className="text-sm md:text-base font-medium text-muted-foreground">{platform.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Why Choose Us Section */}
       <motion.section
        className="relative z-10 py-16 md:py-20 bg-gray-900 text-white"
        variants={slideUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 variants={itemVariant} className="text-3xl md:text-4xl font-bold mb-4"> Why Partner With Us? </motion.h2>
          <motion.p variants={itemVariant} className="text-lg text-gray-300 mb-10 md:mb-12 max-w-3xl mx-auto"> Experience seamless growth with reliable services, secure processing, and dedicated support. </motion.p>
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={staggerContainerVariant}>
            {[ /* Feature data */
              { title: 'Secure Payments', description: 'Your transactions are fully encrypted and protected.' },
              { title: 'Real Engagement', description: 'Boost your profile with genuine interactions.' },
              { title: '24/7 Support', description: 'Our expert team is always available to assist you.' },
            ].map((feature, index) => (
              <motion.div key={index} className="p-6 rounded-lg bg-gray-800/60 backdrop-blur-sm border border-gray-700/50" variants={itemVariant} whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.3)" }} transition={{ duration: 0.2 }} >
                <h3 className="text-xl font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

       {/* Footer */}
      <motion.footer
        className="relative z-10 py-6 text-center text-muted-foreground text-sm bg-background border-t border-border"
         initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.8 }}
       >
            © {new Date().getFullYear()} SocialMediaKenya. All rights reserved.
      </motion.footer>
    </div>
  );
}
// --- END OF FILE Engagements/src/pages/HomePage.tsx ---