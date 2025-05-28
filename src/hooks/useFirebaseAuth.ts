import { useFirebase } from "@/contexts/FirebaseContext";
import { useState, useEffect } from "react";

export const useFirebaseAuth = () => {
  return useFirebase();
};

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

// Helper hook to mimic NextAuth's useSession structure
export const useSession = () => {
  const { user, loading } = useFirebaseAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserData(null);
        setHasAttemptedFetch(false);
        return;
      }

      // If we already have user data for this user, don't fetch again
      if (userData && userData.id === user.uid) {
        return;
      }

      try {
        setUserDataLoading(true);
        setHasAttemptedFetch(true);
        const token = await user.getIdToken();

        const response = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const newUserData = {
            id: data.uid,
            email: data.email,
            name: data.displayName,
            image: data.photoURL,
            roles: data.roles || ["user"],
            creativeRoles: data.creativeRoles || [],
            status: data.status || "active",
          };
          setUserData(newUserData);
        } else {
          console.warn("useSession: API call failed, using fallback data");
          // Fallback to basic Firebase user data if API fails
          setUserData({
            id: user.uid,
            email: user.email,
            name: user.displayName,
            image: user.photoURL,
            roles: ["user"],
            creativeRoles: [],
            status: "active",
          });
        }
      } catch (error) {
        console.error("useSession: Error fetching user data:", error);
        // Fallback to basic Firebase user data
        setUserData({
          id: user.uid,
          email: user.email,
          name: user.displayName,
          image: user.photoURL,
          roles: ["user"],
          creativeRoles: [],
          status: "active",
        });
      } finally {
        setUserDataLoading(false);
      }
    };

    fetchUserData();
  }, [user?.uid]); // Only re-run when the user UID changes, not the entire user object

  // Improved status logic to prevent authentication loops
  const getStatus = () => {
    // If Firebase is still loading, we're loading
    if (loading) {
      return "loading";
    }

    // If no Firebase user, we're unauthenticated
    if (!user) {
      return "unauthenticated";
    }

    // If we have a Firebase user, we're authenticated regardless of user data fetch status
    // This prevents the double loading spinner issue
    return "authenticated";
  };

  const status = getStatus();

  const finalReturn = {
    data: userData
      ? {
          user: userData,
        }
      : null,
    status,
  };

  // Uncomment for debugging authentication issues
  // console.log("useSession debug:", {
  //   firebaseLoading: loading,
  //   hasUser: !!user,
  //   userDataLoading,
  //   hasAttemptedFetch,
  //   hasUserData: !!userData,
  //   finalStatus: status
  // });

  return finalReturn;
};
