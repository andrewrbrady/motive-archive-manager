import { useEffect, useState, useCallback } from "react";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasValidToken: boolean;
}

interface AuthError {
  code: string;
  message: string;
  details?: string;
}

// Session interface to match what components expect
interface SessionData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    roles?: string[];
    creativeRoles?: string[];
    status?: string;
    accountType?: string;
    profileImage?: string;
    bio?: string;
  } | null;
}

interface SessionState {
  data: SessionData | null;
  status: "loading" | "authenticated" | "unauthenticated";
  error: string | null;
}

export function useFirebaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
    hasValidToken: false,
  });

  const [tokenValidationAttempts, setTokenValidationAttempts] = useState(0);
  const MAX_TOKEN_VALIDATION_ATTEMPTS = 3;

  // Validate token with retry logic
  const validateToken = useCallback(async (user: User): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = await user.getIdToken(true); // Force refresh

      // Test the token with a simple API call
      const response = await fetch("/api/auth/validate", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const isValid = response.ok;

      return isValid;
    } catch (error: any) {
      console.error("💥 useFirebaseAuth: Token validation error:", error);
      return false;
    }
  }, []);

  // Enhanced auth state change handler
  const handleAuthStateChange = useCallback(
    async (user: User | null) => {
      if (!user) {
        setAuthState({
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
          hasValidToken: false,
        });
        setTokenValidationAttempts(0);
        return;
      }

      // Set loading state while validating
      setAuthState((prev) => ({
        ...prev,
        user,
        loading: true,
        isAuthenticated: true,
      }));

      // Validate token
      const hasValidToken = await validateToken(user);

      if (
        !hasValidToken &&
        tokenValidationAttempts < MAX_TOKEN_VALIDATION_ATTEMPTS
      ) {
        setTokenValidationAttempts((prev) => prev + 1);

        // Retry after a short delay
        setTimeout(
          () => {
            handleAuthStateChange(user);
          },
          1000 * (tokenValidationAttempts + 1)
        ); // Exponential backoff
        return;
      }

      setAuthState({
        user,
        loading: false,
        error: hasValidToken ? null : "Authentication token is invalid",
        isAuthenticated: !!user,
        hasValidToken,
      });

      if (hasValidToken) {
        setTokenValidationAttempts(0);
      }
    },
    [validateToken, tokenValidationAttempts]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      handleAuthStateChange,
      (error) => {
        console.error("💥 useFirebaseAuth: Auth state change error:", error);
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [handleAuthStateChange]);

  // Method to refresh authentication
  const refreshAuth = useCallback(async () => {
    if (!authState.user) return false;

    setAuthState((prev) => ({ ...prev, loading: true }));

    try {
      await authState.user.getIdToken(true); // Force token refresh
      const hasValidToken = await validateToken(authState.user);

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        hasValidToken,
        error: hasValidToken ? null : "Failed to refresh authentication",
      }));

      return hasValidToken;
    } catch (error: any) {
      console.error("💥 useFirebaseAuth: Refresh error:", error);
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
        hasValidToken: false,
      }));
      return false;
    }
  }, [authState.user, validateToken]);

  // Method to get a fresh token
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!authState.user) {
      return null;
    }

    try {
      const token = await authState.user.getIdToken(true);

      // Validate the token
      const isValid = await validateToken(authState.user);
      if (!isValid) {
        return null;
      }

      return token;
    } catch (error: any) {
      console.error("💥 useFirebaseAuth: Error getting token:", error);
      return null;
    }
  }, [authState.user, validateToken]);

  // Method to sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error: any) {
      console.error("💥 useFirebaseAuth: Google sign in error:", error);
      throw error;
    }
  }, []);

  // Method to sign out
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("💥 useFirebaseAuth: Sign out error:", error);
      throw error;
    }
  }, []);

  return {
    ...authState,
    refreshAuth,
    getValidToken,
    signInWithGoogle,
    signOut,
  };
}

// Enhanced useSession hook that works with Firebase Auth
export function useSession(): SessionState {
  const { user, loading, isAuthenticated, error, getValidToken } =
    useFirebaseAuth();
  const [sessionState, setSessionState] = useState<SessionState>({
    data: null,
    status: "loading",
    error: null,
  });

  // Fetch user roles from Firestore using authenticated request
  const fetchUserRoles = useCallback(
    async (userId: string): Promise<string[]> => {
      try {
        const token = await getValidToken();
        if (!token) {
          return [];
        }

        const response = await fetch(`/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          return userData.user?.roles || [];
        }
      } catch (error) {
        console.error("💥 fetchUserRoles: Error fetching user roles:", error);
      }
      return [];
    },
    [getValidToken]
  );

  useEffect(() => {
    if (loading) {
      setSessionState({
        data: null,
        status: "loading",
        error: null,
      });
      return;
    }

    if (!isAuthenticated || !user) {
      setSessionState({
        data: null,
        status: "unauthenticated",
        error: error,
      });
      return;
    }

    // Convert Firebase user to session format and fetch roles
    const loadUserSession = async () => {
      const roles = await fetchUserRoles(user.uid);

      setSessionState({
        data: {
          user: {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            image: user.photoURL,
            roles: roles,
          },
        },
        status: "authenticated",
        error: null,
      });
    };

    loadUserSession();
  }, [user, loading, isAuthenticated, error, fetchUserRoles]);

  return sessionState;
}

// Utility hook for making authenticated API calls
export function useAuthenticatedFetch() {
  const { getValidToken, isAuthenticated, hasValidToken } = useFirebaseAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      if (!isAuthenticated || !hasValidToken) {
        throw new Error("Not authenticated");
      }

      const token = await getValidToken();
      if (!token) {
        throw new Error("Failed to get valid authentication token");
      }

      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        throw new Error("Authentication token expired");
      }

      return response;
    },
    [getValidToken, isAuthenticated, hasValidToken]
  );

  return { authenticatedFetch, isAuthenticated, hasValidToken };
}
