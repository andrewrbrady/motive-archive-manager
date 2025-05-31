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
import { useAPI } from "@/hooks/useAPI";

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
  const api = useAPI();

  // Validate token with retry logic
  const validateToken = useCallback(
    async (user: User): Promise<boolean> => {
      if (!user || !api) return false;

      try {
        const token = await user.getIdToken(false); // Don't force refresh initially
        if (!token) return false;

        // Validate with the API using the new API client
        await api.get("/auth/validate");
        return true;
      } catch (error: any) {
        console.error("💥 useFirebaseAuth: Token validation error:", error);

        // If validation endpoint fails, fall back to basic Firebase token check
        // This helps handle network issues or temporary API problems
        try {
          console.log(
            "🔄 useFirebaseAuth: Validation endpoint failed, trying basic token check..."
          );
          const token = await user.getIdToken(false);
          // If we can get a token and user is authenticated, assume it's valid
          // This is a fallback to prevent auth failures due to API issues
          return !!token;
        } catch (tokenError) {
          console.error(
            "💥 useFirebaseAuth: Basic token check also failed:",
            tokenError
          );
          return false;
        }
      }
    },
    [api]
  );

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

// Utility hook for making authenticated API calls
export function useAuthenticatedFetch() {
  const { getValidToken, isAuthenticated, hasValidToken, refreshAuth } =
    useFirebaseAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // First check if we're authenticated at all
      if (!isAuthenticated) {
        throw new Error("Not authenticated");
      }

      // If we don't have a valid token, try to refresh first
      if (!hasValidToken) {
        console.log(
          "🔄 authenticatedFetch: Token not valid, attempting refresh..."
        );
        try {
          const refreshSuccess = await refreshAuth();
          if (!refreshSuccess) {
            throw new Error("Failed to refresh authentication token");
          }
        } catch (refreshError) {
          console.error("💥 authenticatedFetch: Refresh failed:", refreshError);
          throw new Error("Not authenticated");
        }
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

      // If we get a 401, try to refresh token once and retry the request
      if (response.status === 401) {
        console.log(
          "🔄 authenticatedFetch: Got 401, attempting token refresh and retry..."
        );
        try {
          const refreshSuccess = await refreshAuth();
          if (refreshSuccess) {
            const newToken = await getValidToken();
            if (newToken) {
              // Retry the request with the new token
              const retryHeaders = {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              };

              const retryResponse = await fetch(url, {
                ...options,
                headers: retryHeaders,
              });

              if (retryResponse.status === 401) {
                throw new Error("Authentication token expired");
              }

              return retryResponse;
            }
          }
        } catch (retryError) {
          console.error("💥 authenticatedFetch: Retry failed:", retryError);
        }

        throw new Error("Authentication token expired");
      }

      return response;
    },
    [getValidToken, isAuthenticated, hasValidToken, refreshAuth]
  );

  return { authenticatedFetch, isAuthenticated, hasValidToken };
}
