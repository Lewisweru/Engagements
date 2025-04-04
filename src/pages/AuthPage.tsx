import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Ensure path is correct
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Ensure path is correct
import { motion, AnimatePresence } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { ArrowLeft, UserPlus, LogIn } from 'lucide-react';
import toast from 'react-hot-toast'; // Ensure react-hot-toast is installed

// --- Background Animation Component ---
// NOTE: Accessing window dimensions directly might cause issues with SSR.
// Consider using a hook like useWindowSize if SSR is a possibility.
const BackgroundAnimation = React.memo(() => {
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
            key={i}
            className="absolute text-3xl opacity-50" // Removed text-red-500
            initial={{
                opacity: 0,
                y: viewportHeight + Math.random() * 100 + 50,
                x: Math.random() * viewportWidth,
                scale: 0.5,
            }}
            animate={{
                opacity: [0, 0.5, 0],
                y: -100, // Animate off screen top
                // x: [null, Math.random() * viewportWidth], // Keep random x or add drift
                scale: [0.5, 1, 0.5],
                rotate: [0, Math.random() * 180 - 90, 0],
            }}
            transition={{
                duration: Math.random() * 5 + 8, // Adjusted duration
                repeat: Infinity,
                delay: Math.random() * 8, // Adjusted delay
                ease: "linear"
            }}
            style={{
                left: 0, // Animation controls x position
                top: 0, // Animation controls y position
                // Optional subtle shadow
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)'
            }}
            >
            {Math.random() > 0.5 ? '❤️' : '👍'}
            </motion.div>
        ))}
        </div>
    );
});
BackgroundAnimation.displayName = 'BackgroundAnimation';

// --- Country List ---
const countries = [
    "Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi",
    "Nigeria", "Ghana", "South Africa", "United States", "United Kingdom", "Other"
];

// --- Auth Page Component ---
export default function AuthPage() {
  const [view, setView] = useState<'initial' | 'login' | 'signup'>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the updated signup function signature from AuthContext
  const { signup, login, googleSignIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  // --- Framer Motion Variants ---
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  // --- Form Submission Handler ---
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (view === 'login') {
      try {
        await login(email, password);
        toast.success("Login successful! Redirecting...");
        navigate('/engagement'); // Redirect after successful login
      } catch (err: any) {
        // Error toast is likely handled within AuthContext's login function
        console.error('Login error on page:', err);
        // Set local error state if AuthContext doesn't handle all UI feedback
        // setError(err.message || "Failed to log in.");
      } finally {
        setLoading(false);
      }
    } else if (view === 'signup') {
      // Frontend Validation
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
         setError("Password must be at least 6 characters long.");
         setLoading(false);
         return;
      }
       if (!username.trim()) {
         setError("Username is required.");
         setLoading(false);
         return;
      }
       if (!country) {
         setError("Please select your country.");
         setLoading(false);
         return;
      }
      // More validation (email format, username format) could be added here

      try {
        // --- *** Call updated signup function with all required arguments *** ---
        await signup(email, password, username.trim(), country);
        // --- **************************************************************** ---

        // Toast success is handled in AuthContext now
        // toast.success(`Welcome, ${username}! Account created.`); // Can remove from here

        // No need to call updateUserProfile here anymore,
        // as the signup function in context now handles setting displayName
        // await updateUserProfile(username); // <-- REMOVE THIS LINE

        navigate('/engagement'); // Redirect after successful signup

      } catch (err: any) {
         // Error toast is likely handled within AuthContext's signup function
        console.error('Signup error on page:', err);
         // Set local error state if AuthContext doesn't handle all UI feedback
         // setError(err.message || "Failed to create account.");
      } finally {
        setLoading(false);
      }
    }
  }, [view, email, password, username, country, confirmPassword, login, signup, /*remove updateUserProfile*/ navigate]); // Removed updateUserProfile from dependencies

  // --- Google Sign-In Handler ---
  const handleGoogleSignIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await googleSignIn();
      // Success toast handled in context
      navigate('/engagement');
    } catch (error) {
      // Error toast handled in context
      console.error("Google Sign-In Error on page:", error);
      // setError("Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  }, [googleSignIn, navigate]);

   // --- Password Reset Handler ---
   const handlePasswordReset = useCallback(async () => {
        if (!email) {
            setError("Please enter your email address first to reset password.");
            return;
        }
        setError(null);
        setLoading(true); // Indicate processing
        try {
            await resetPassword(email);
            // Success toast handled in context
        } catch (err: any) {
            // Error toast handled in context
             console.error("Password Reset Error on page:", err);
             // setError(err.message || "Failed to send password reset email.");
        } finally {
            setLoading(false);
        }
   }, [email, resetPassword]);

   // --- Memoized View Content ---
   const currentViewContent = useMemo(() => {
        switch (view) {
            case 'login':
                return (
                    <motion.div key="login" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                        <div className="text-center mb-4">
                           <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                           <p className="mt-1 text-gray-300">Sign in to continue</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Display local error state if needed */}
                            {error && <p className="text-red-400 text-sm text-center py-2">{error}</p>}
                            {/* Email Input */}
                            <div>
                                <label htmlFor="login-email" className="block text-sm font-medium text-gray-300">Email address</label>
                                <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-blue-400 placeholder-gray-500" placeholder="you@example.com"/>
                            </div>
                            {/* Password Input */}
                            <div>
                                <label htmlFor="login-password" className="block text-sm font-medium text-gray-300">Password</label>
                                <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-blue-400 placeholder-gray-500" placeholder="••••••••"/>
                            </div>
                            {/* Forgot Password */}
                            <div className="text-right">
                                <button type="button" onClick={handlePasswordReset} className="text-sm text-blue-400 hover:underline disabled:opacity-50" disabled={loading || !email}>
                                    Forgot Password?
                                </button>
                            </div>
                            {/* Submit Button */}
                            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90" disabled={loading}>
                                {loading ? <div className="loader mx-auto"></div> : 'Sign In'}
                            </Button>
                            {/* Google Button */}
                            <Button variant="outline" onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-200 transition border-gray-300" disabled={loading}>
                                <FcGoogle size={20} /> Continue with Google
                            </Button>
                            {/* Switch to Sign Up */}
                            <div className="text-center mt-3">
                                <button type="button" onClick={() => { setView('signup'); setError(null); }} className="text-sm text-blue-400 hover:underline" disabled={loading}>
                                    Don't have an account? Sign up
                                </button>
                            </div>
                            {/* Back Button */}
                            <Button variant="ghost" size="sm" onClick={() => { setView('initial'); setError(null); }} className="w-full text-gray-400 hover:text-white mt-2" disabled={loading}>
                                <ArrowLeft size={16} className="mr-1" /> Back
                            </Button>
                        </form>
                    </motion.div>
                );
            case 'signup':
                return (
                     <motion.div key="signup" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                         <div className="text-center mb-4">
                           <h2 className="text-2xl font-bold text-white">Create Account</h2>
                           <p className="mt-1 text-gray-300">Join us and explore</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* Display local error state */}
                            {error && <p className="text-red-400 text-sm text-center py-2">{error}</p>}
                            {/* Username Input */}
                            <div>
                                <label htmlFor="signup-username" className="block text-sm font-medium text-gray-300">Username</label>
                                <input id="signup-username" type="text" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400 placeholder-gray-500" placeholder="Choose a unique username"/>
                            </div>
                            {/* Email Input */}
                            <div>
                                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300">Email address</label>
                                <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400 placeholder-gray-500" placeholder="you@example.com"/>
                            </div>
                            {/* Country Select */}
                            <div>
                                <label htmlFor="signup-country" className="block text-sm font-medium text-gray-300">Country</label>
                                <select id="signup-country" required value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400">
                                    <option value="" disabled>-- Select Country --</option>
                                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            {/* Password Input */}
                            <div>
                                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300">Password</label>
                                <input id="signup-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400 placeholder-gray-500" placeholder="Create a password (min. 6 chars)"/>
                            </div>
                            {/* Confirm Password Input */}
                            <div>
                                <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-300">Confirm Password</label>
                                <input id="signup-confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400 placeholder-gray-500" placeholder="Repeat your password"/>
                            </div>
                            {/* Submit Button */}
                            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90" disabled={loading}>
                                {loading ? <div className="loader mx-auto"></div> : 'Create Account'}
                            </Button>
                            {/* Google Button */}
                            <Button variant="outline" onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-200 transition border-gray-300" disabled={loading}>
                                <FcGoogle size={20} /> Sign up with Google
                            </Button>
                            {/* Switch to Sign In */}
                            <div className="text-center mt-3">
                                <button type="button" onClick={() => { setView('login'); setError(null); }} className="text-sm text-blue-400 hover:underline" disabled={loading}>
                                    Already have an account? Sign in
                                </button>
                            </div>
                            {/* Back Button */}
                            <Button variant="ghost" size="sm" onClick={() => { setView('initial'); setError(null); }} className="w-full text-gray-400 hover:text-white mt-2" disabled={loading}>
                                <ArrowLeft size={16} className="mr-1" /> Back
                            </Button>
                        </form>
                    </motion.div>
                );
            case 'initial':
            default:
                // Initial view with Login/Create Account buttons
                return (
                    <motion.div key="initial" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center space-y-5 pt-5 pb-5">
                         <h2 className="text-2xl font-bold text-white text-center">Join or Sign In</h2>
                         <p className="text-gray-300 text-center">Get started by creating an account or logging in.</p>
                         {/* Login Button */}
                         <Button onClick={() => { setView('login'); setError(null); }} className="w-full max-w-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-lg py-3">
                            <LogIn size={20} className="mr-2"/> Login
                         </Button>
                         {/* Create Account Button */}
                         <Button onClick={() => { setView('signup'); setError(null); }} className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-lg py-3">
                            <UserPlus size={20} className="mr-2"/> Create Account
                         </Button>
                         {/* Google Button */}
                         <div className="pt-4 w-full max-w-xs">
                             <Button variant="outline" onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-200 transition border-gray-300" disabled={loading}>
                                <FcGoogle size={20} /> Continue with Google
                            </Button>
                         </div>
                    </motion.div>
                );
        }
   }, [view, email, password, username, country, confirmPassword, loading, error, handleSubmit, handleGoogleSignIn, handlePasswordReset]); // Include all dependencies


  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-black text-white overflow-hidden">
      <BackgroundAnimation />
      <motion.div
        layout // Animate layout changes for smooth height adjustments
        transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
        className={`relative z-10 w-full max-w-md p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-lg bg-gray-900/80 border border-gray-700/50`}
      >
          <AnimatePresence mode="wait">
             {currentViewContent}
          </AnimatePresence>
      </motion.div>

      
    </div>
  );
}