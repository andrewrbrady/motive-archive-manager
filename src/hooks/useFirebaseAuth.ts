import { useEffect, useState, useCallback, useRef } from "react";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getValidToken as getValidTokenFromClient,
  refreshToken,
} from "@/lib/api-client";
import { APIClient } from "@/lib/api-client";

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

  const tokenValidationAttemptsRef = useRef(0);
  const MAX_TOKEN_VALIDATION_ATTEMPTS = 3;

  // Validate token with retry logic
  const validateToken = useCallback(async (user: User): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = await user.getIdToken(false); // Don't force refresh initially
      if (!token) return false;

      // Strategy: Start with Firebase validation, then progressively validate with API
      // This prevents chicken-and-egg problems during authentication startup

      // Step 1: Firebase token validation (always works)
      console.log("✅ useFirebaseAuth: Token validated via Firebase");

      // Step 2: Optional API validation (only if system is ready)
      try {
        const apiClient = APIClient.getInstance();
        await apiClient.get("auth/validate");
        console.log("✅ useFirebaseAuth: Token also validated via API");
        return true;
      } catch (apiError: any) {
        // API validation failed, but Firebase token is valid
        console.warn(
          "⚠️ useFirebaseAuth: API validation failed, but Firebase token is valid:",
          {
            message: apiError?.message,
            status: apiError?.status,
          }
        );

        // For now, trust Firebase validation
        // TODO: Implement retry logic for API validation once system is more stable
        return true;
      }
    } catch (error: any) {
      console.error("💥 useFirebaseAuth: Token validation error:", {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        details: error?.details,
        fullError: error,
      });

      // If Firebase token validation fails, fall back to basic token check
      try {
        console.log(
          "🔄 useFirebaseAuth: Firebase validation failed, trying basic token check..."
        );
        const token = await user.getIdToken(false);
        return !!token;
      } catch (tokenError) {
        console.error(
          "💥 useFirebaseAuth: Basic token check also failed:",
          tokenError
        );
        return false;
      }
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
        tokenValidationAttemptsRef.current = 0;
        return;
      }

      // Set loading state while validating
      setAuthState((prev) => ({
        ...prev,
        user,
        loading: true,
        isAuthenticated: true,
      }));

      // Validate token with a single attempt (no recursive retries)
      let isValid = await validateToken(user);

      // If validation fails, try once with a fresh token
      if (!isValid && tokenValidationAttemptsRef.current < 1) {
        tokenValidationAttemptsRef.current++;
        try {
          console.log("🔄 useFirebaseAuth: Attempting token refresh...");
          await refreshToken(); // Use centralized refresh function
          isValid = await validateToken(user);
        } catch (error) {
          console.error("💥 useFirebaseAuth: Token refresh failed:", error);
        }
      }

      setAuthState({
        user,
        loading: false,
        error: null,
        isAuthenticated: true,
        hasValidToken: isValid,
      });
    },
    [validateToken]
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
      // Use the centralized refreshToken function
      await refreshToken();
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
      // Use the centralized getValidToken function
      const token = await getValidTokenFromClient();
      return token;
    } catch (error: any) {
      console.error("💥 useFirebaseAuth: Error getting token:", error);
      return null;
    }
  }, [authState.user, authState.hasValidToken]);

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

  const hasLoadedSession = useRef(false);
  const currentUserId = useRef<string | null>(null);

  // Fetch user roles from Firestore using authenticated request
  const fetchUserRoles = useCallback(
    async (userId: string): Promise<string[]> => {
      try {
        const apiClient = APIClient.getInstance();
        const userData = (await apiClient.get(`users/${userId}`)) as {
          user?: { roles?: string[] };
        };
        return userData.user?.roles || [];
      } catch (error) {
        console.error("💥 fetchUserRoles: Error fetching user roles:", error);
        return [];
      }
    },
    []
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
      hasLoadedSession.current = false;
      currentUserId.current = null;
      return;
    }

    // Only load session if we haven't loaded it for this user yet
    if (!hasLoadedSession.current || currentUserId.current !== user.uid) {
      currentUserId.current = user.uid;
      hasLoadedSession.current = true;

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
    }
  }, [user, loading, isAuthenticated, error, fetchUserRoles]);

  return sessionState;
}

// NOTE: useAuthenticatedFetch has been removed and replaced by the global API client.
//
// For authenticated API calls, use:
// import { useAPI } from "@/hooks/useAPI";
//
// Example usage:
// const api = useAPI();
// if (!api) return; // Handle loading state
// const data = await api.get("/endpoint");
// const result = await api.post("/endpoint", { data });
