//src/context/AuthContext.tsx
"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Define user type
type User = {
  uid: string;
  name: string;
  role: string;
  departmentName?: string;
  profileImage?: string; 
  // Add other user properties as needed
};

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  updateProfileImage: (imageUrl: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUserState(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  // Function to set user and save to localStorage
  const setUser = (userData: User | null) => {
    setUserState(userData);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      localStorage.removeItem("user");
    }
  };

  // Function to logout
  const logout = () => {
    setUser(null);
    // You could also make an API call to invalidate the session
    // fetch('/api/auth/logout', { method: 'POST' });
  };

  // Function for AuthProvider - update profile img
  const updateProfileImage = (imageUrl: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        profileImage: imageUrl
      };
      setUser(updatedUser);
    }
  };

  const value = {
    user,
    setUser,
    logout,
    updateProfileImage,
    isAuthenticated: !!user,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
