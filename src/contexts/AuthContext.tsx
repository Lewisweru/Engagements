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
import { FirebaseError } from "firebase/app";
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

      // Send user data to MongoDB
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseUid: user.uid, email: user.email }),
      });

      setCurrentUser(user); // Ensure UI updates
      toast.success("Account created successfully!");
    } catch (error) {
      toast.error("Failed to create account");
      throw error;
    }
  }

  async function login(email: string, password: string): Promise<UserCredential> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setCurrentUser(result.user);
      toast.success("Logged in successfully!");
      return result;
    } catch (error) {
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
      toast.error("Failed to log out");
      throw error;
    }
  }

  async function resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error("Failed to send password reset email");
      throw error;
    }
  }

  async function updateUserProfile(displayName: string): Promise<void> {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
        setCurrentUser({ ...auth.currentUser, displayName });
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      toast.error("Failed to update profile");
      throw error;
    }
  }

  async function googleSignIn(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Send user data to MongoDB
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseUid: user.uid, email: user.email }),
      });

      setCurrentUser(user);
      toast.success("Logged in with Google successfully!");
    } catch (error) {
      if (error instanceof FirebaseError) {
        console.error("Firebase Error:", error);
        toast.error(error.message);
      } else {
        console.error("Unexpected Error:", error);
        toast.error("Something went wrong!");
      }
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
