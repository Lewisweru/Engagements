import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';

// Background Animation Component (Optimized to Prevent Re-renders)
const BackgroundAnimation = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute text-red-500 text-3xl"
        initial={{ opacity: 0, y: 0 }}
        animate={{
          opacity: [0, 1, 0],
          y: [0, -300, -600], // Increased movement for better visibility
          x: [Math.random() * 200 - 100, Math.random() * 300 - 150],
        }}
        transition={{
          duration: Math.random() * 4 + 3,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
        style={{
          left: `${Math.random() * 100}vw`,
          top: `${Math.random() * 100}vh`,
        }}
      >
        {Math.random() > 0.5 ? '❤️' : '👍'}
      </motion.div>
    ))}
  </div>
));

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, login, googleSignIn } = useAuth(); // Added Google Sign-In
  const navigate = useNavigate();

  // Prevent Re-renders When Typing by Using useCallback
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        if (isLogin) {
          await login(email, password);
        } else {
          await signup(email, password);
        }
        navigate('/dashboard');
      } catch (error) {
        console.error('Authentication error:', error);
      } finally {
        setLoading(false);
      }
    },
    [isLogin, email, password, login, signup, navigate]
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-black">
      {/* Static Animated Background */}
      <BackgroundAnimation />

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-10 w-full max-w-sm p-6 rounded-xl shadow-lg backdrop-blur-md transition-all ${
          isLogin ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-purple-700 to-blue-500'
        }`}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="mt-2 text-gray-300">
            {isLogin ? 'Sign in to continue' : 'Join us and explore the platform'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:ring-2 focus:ring-blue-400"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:ring-2 focus:ring-blue-400"
              placeholder="Enter your password"
            />
          </div>

          {/* Forgot Password Link */}
          {isLogin && (
            <div className="text-right">
              <button className="text-sm text-blue-400 hover:underline">Forgot Password?</button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90"
            disabled={loading}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        {/* Google Sign-In */}
        <div className="mt-4">
          <Button
            onClick={googleSignIn}
            className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 transition"
          >
            <FcGoogle size={20} /> Continue with Google
          </Button>
        </div>

        {/* Toggle Sign Up/Login */}
        <div className="text-center mt-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-400 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
