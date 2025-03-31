import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "react-hot-toast";

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/firebase-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || "Anonymous User",
          profilePic: user.photoURL || "default-profile.png",
        }),
      });

      setCurrentUser(user);
      toast.success("Account created successfully!");
    } catch (error) {
      console.error("Signup Error:", error);
      toast.error("Failed to create account");
    }
  }
  
  
  async function login(email: string, password: string): Promise<UserCredential> {
    try {
      // Log in with Firebase
      const result = await signInWithEmailAndPassword(auth, email, password);
  
      // Send login data to the backend for validation
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      if (!response.ok) {
        throw new Error("Backend login validation failed");
      }
  
      setCurrentUser(result.user);
      toast.success("Logged in successfully!");
      return result;
    } catch (error) {
      console.error("Login Error:", error);
      toast.error("Failed to log in");
      throw error;
    }
  }

  async function logout(): Promise<void> {
    try {
      await signOut(auth);
      setCurrentUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout Error:", error);
      toast.error("Failed to log out");
    }
  }

  async function resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
    } catch (error) {
      console.error("Password Reset Error:", error);
      toast.error("Failed to send password reset email");
    }
  }

  async function updateUserProfile(displayName: string): Promise<void> {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
        await auth.currentUser.reload();
        setCurrentUser(auth.currentUser);
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Profile Update Error:", error);
      toast.error("Failed to update profile");
    }
  }

  async function googleSignIn(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/firebase-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || "Anonymous User",
          profilePic: user.photoURL || "default-profile.png",
        }),
      });

      setCurrentUser(user);
      toast.success("Logged in with Google successfully!");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      toast.error("Something went wrong!");
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    googleSignIn,
    loading,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
