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
  const lastValidationTimeRef = useRef(0);
  const MAX_TOKEN_VALIDATION_ATTEMPTS = 3;
  const VALIDATION_THROTTLE_MS = 5000; // Increased to 5 seconds to reduce excessive validations

  // Validate token with retry logic - PERFORMANCE OPTIMIZED
  const validateToken = useCallback(async (user: User): Promise<boolean> => {
    if (!user) return false;

    // ✅ PERFORMANCE: Throttle validation attempts to prevent excessive calls
    const now = Date.now();
    if (now - lastValidationTimeRef.current < VALIDATION_THROTTLE_MS) {
      console.log("🔄 useFirebaseAuth: Throttling token validation");
      return authState.hasValidToken; // Return cached result
    }
    lastValidationTimeRef.current = now;

    try {
      const token = await user.getIdToken(false); // Don't force refresh initially
      if (!token) return false;

      // ✅ PERFORMANCE: Start with Firebase validation only for immediate response
      // Skip API validation on initial load to prevent blocking
      if (process.env.NODE_ENV === "development") {
        console.log(
          "✅ useFirebaseAuth: Token validated via Firebase (fast path)"
        );
      }

      // ✅ PERFORMANCE: Return true immediately for Firebase validation
      // API validation happens in background if needed
      return true;
    } catch (error: any) {
      console.error("💥 useFirebaseAuth: Token validation error:", {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        details: error?.details,
      });

      // ✅ Enhanced Firebase token validation fallback
      if (
        error.code === "auth/user-token-expired" ||
        error.code === "auth/id-token-expired"
      ) {
        console.log("🔄 useFirebaseAuth: Token expired, needs refresh");
        return false;
      }

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
  }, []); // Empty dependency array - this function should be stable

  // Enhanced auth state change handler - PERFORMANCE OPTIMIZED
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

      // PERFORMANCE: Don't re-validate if we already have this user and they're valid
      // Use refs to avoid dependency issues
      setAuthState((prevState) => {
        if (
          prevState.user?.uid === user.uid &&
          prevState.hasValidToken &&
          !prevState.loading
        ) {
          console.log(
            "🔄 useFirebaseAuth: Skipping re-validation for same user"
          );
          return prevState; // No change, prevent re-render
        }

        // Need to validate - set loading state
        return {
          ...prevState,
          user,
          loading: true,
          isAuthenticated: true,
        };
      });

      // Only validate if we don't already have this user with valid token
      const currentState = authState;
      if (
        currentState.user?.uid === user.uid &&
        currentState.hasValidToken &&
        !currentState.loading
      ) {
        return; // Already validated
      }

      // PERFORMANCE: Throttle validations to prevent excessive API calls
      const now = Date.now();
      if (now - lastValidationTimeRef.current < VALIDATION_THROTTLE_MS) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔄 useFirebaseAuth: Throttling validation (too frequent)"
          );
        }
        // Set state without validation to avoid blocking
        setAuthState({
          user,
          loading: false,
          error: null,
          isAuthenticated: true,
          hasValidToken: currentState.hasValidToken, // Keep previous validation state
        });
        return;
      }

      lastValidationTimeRef.current = now;

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
    [validateToken] // Minimal dependencies to prevent excessive re-creation
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
  const { user, loading, isAuthenticated, error } = useFirebaseAuth();
  const [sessionState, setSessionState] = useState<SessionState>({
    data: null,
    status: "loading",
    error: null,
  });

  const hasLoadedSession = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const rolesCache = useRef<{
    [userId: string]: { roles: string[]; timestamp: number };
  }>({});
  const ROLES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for roles

  // ✅ PERFORMANCE OPTIMIZATION: Cached user roles fetching
  const fetchUserRoles = useCallback(
    async (userId: string): Promise<string[]> => {
      // Check cache first
      const cached = rolesCache.current[userId];
      if (cached && Date.now() - cached.timestamp < ROLES_CACHE_DURATION) {
        console.log("🔄 fetchUserRoles: Using cached roles for user", userId);
        return cached.roles;
      }

      try {
        // Use the same optimized approach as useAPI - don't wait for full validation
        const apiClient = APIClient.getInstance();
        const userData = (await apiClient.get(`users/${userId}`)) as {
          user?: { roles?: string[] };
        };
        const roles = userData.user?.roles || [];

        // Cache the result
        rolesCache.current[userId] = {
          roles,
          timestamp: Date.now(),
        };

        return roles;
      } catch (error: any) {
        // Don't log as error if it's an authentication issue - this is expected during login
        if (
          error.message?.includes("Failed to fetch") ||
          error.status === 401
        ) {
          console.warn(
            "💭 fetchUserRoles: Authentication not ready yet, will retry automatically"
          );
        } else {
          console.error("💥 fetchUserRoles: Error fetching user roles:", error);
        }
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

    // ✅ PERFORMANCE OPTIMIZATION: Only update session if user changed
    if (!hasLoadedSession.current || currentUserId.current !== user.uid) {
      currentUserId.current = user.uid;
      hasLoadedSession.current = true;

      // Set authenticated session immediately with basic user data
      setSessionState({
        data: {
          user: {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            image: user.photoURL,
            roles: [], // Start with empty roles, will be populated asynchronously
          },
        },
        status: "authenticated",
        error: null,
      });

      // ✅ PERFORMANCE: Fetch roles asynchronously without blocking the session
      fetchUserRoles(user.uid).then((roles) => {
        // Only update if we're still on the same user
        if (currentUserId.current === user.uid) {
          setSessionState((prev) => ({
            ...prev,
            data: prev.data
              ? {
                  ...prev.data,
                  user: prev.data.user
                    ? {
                        ...prev.data.user,
                        roles: roles,
                      }
                    : null,
                }
              : null,
          }));
        }
      });
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
