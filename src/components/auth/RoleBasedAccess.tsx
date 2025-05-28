import { ReactNode } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";

type RoleBasedAccessProps = {
  /**
   * Array of roles allowed to access the content
   */
  allowedRoles: string[];
  /**
   * Component or content to render if user has permission
   */
  children: ReactNode;
  /**
   * Component or content to render if user doesn't have permission
   * If not provided, nothing will be rendered
   */
  fallback?: ReactNode;
  /**
   * Whether to require all roles in allowedRoles (default: false, any role is sufficient)
   */
  requireAllRoles?: boolean;
};

/**
 * Component that renders children only if the current user has the required role(s)
 */
export default function RoleBasedAccess({
  allowedRoles,
  children,
  fallback = null,
  requireAllRoles = false,
}: RoleBasedAccessProps) {
  const { data: session, status } = useSession();

  // While loading, render nothing or a skeleton if provided
  if (status === "loading") {
    return null;
  }

  // If not authenticated, show fallback
  if (!session || !session.user) {
    return <>{fallback}</>;
  }

  const userRoles = session.user.roles || [];
  let hasAccess = false;

  if (requireAllRoles) {
    // User must have ALL specified roles
    hasAccess = allowedRoles.every((role) => userRoles.includes(role));
  } else {
    // User needs at least ONE of the roles
    hasAccess = allowedRoles.some((role) => userRoles.includes(role));
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Admin-only access component (convenience wrapper)
 */
export function AdminOnly({
  children,
  fallback = null,
}: Omit<RoleBasedAccessProps, "allowedRoles">) {
  return (
    <RoleBasedAccess allowedRoles={["admin"]} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

/**
 * Editor access component (convenience wrapper)
 */
export function EditorAccess({
  children,
  fallback = null,
}: Omit<RoleBasedAccessProps, "allowedRoles">) {
  return (
    <RoleBasedAccess allowedRoles={["admin", "editor"]} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}
