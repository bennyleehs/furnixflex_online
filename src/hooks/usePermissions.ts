// src/hooks/usePermissions.ts
import { useState, useEffect, useCallback } from "react";
import { fetchPermissionsOnce } from "@/utils/permissionCache";

// Define permission mapping based on your action numbers:
// These map to the *specific* permission ID for that action type.
// The `checkPermissionLogic` will then determine if a user's actual permission
// (e.g., 1.0.1) grants access to this required action (e.g., 1.0.3).
const PERMISSION_MAPPINGS = {
  create: (prefix: string) => `${prefix}.3`,
  edit: (prefix: string) => `${prefix}.2`,
  delete: (prefix: string) => `${prefix}.1`,
  monitor: (prefix: string) => `${prefix}.4`,
};

interface UsePermissionsResult {
  permissions: string[];
  loadingPermissions: boolean;
  error: string | null;
  canCreate: (prefix: string) => boolean;
  canEdit: (prefix: string) => boolean;
  canDelete: (prefix: string) => boolean;
  canMonitor: (prefix: string) => boolean;
  canFullAccess: (prefix: string) => boolean;
  hasPermission: (requiredPermission: string) => boolean;
}

const usePermissions = (): UsePermissionsResult => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingPermissions(true);
    fetchPermissionsOnce()
      .then(setPermissions)
      .catch((err: any) => {
        console.error("Error in usePermissions hook:", err);
        setError(err.message || "Failed to load permissions.");
        setPermissions([]);
      })
      .finally(() => setLoadingPermissions(false));
  }, []); // Empty dependency array means this runs once on component mount

  /**
   * Helper to check if a required permission is granted by the user's permissions,
   * considering the hierarchical nature of your action numbers (1 > 2 > 3 > 4).
   * @param requiredPermission The permission string being checked (e.g., "1.0.3" for create).
   * @param userPerms The array of permissions the user actually has (e.g., ["1.0.1", "2.0.1"]).
   * @returns True if the user has the required permission or a higher-level permission that grants it.
   */
  const checkPermissionLogic = useCallback(
    (requiredPermission: string, userPerms: string[]): boolean => {
      if (!userPerms || userPerms.length === 0) return false;

      const requiredParts = requiredPermission.split(".");
      if (requiredParts.length !== 3) {
        console.warn(
          `Invalid required permission format: ${requiredPermission}. Expected 'MENU.SUBMENU.ACTION'.`,
        );
        return false;
      }
      const requiredMenu = requiredParts[0];
      const requiredSubmenu = requiredParts[1];
      const requiredAction = parseInt(requiredParts[2], 10);

      if (isNaN(requiredAction) || requiredAction < 1 || requiredAction > 4) {
        console.warn(
          `Invalid required action number: ${requiredParts[2]}. Expected 1, 2, 3, or 4.`,
        );
        return false;
      }

      // Iterate through the user's actual permissions
      return userPerms.some((userPerm) => {
        const userParts = userPerm.split(".");
        if (userParts.length !== 3) {
          return false;
        }
        const userMenu = userParts[0];
        const userSubmenu = userParts[1];
        const userAction = parseInt(userParts[2], 10);

        if (isNaN(userAction) || userAction < 1 || userAction > 4) {
          return false;
        }

        // Check if menu and submenu match
        if (
          requiredMenu === userMenu &&
          (requiredSubmenu === userSubmenu ||
            userSubmenu === "0" || // wildcard: user has all submenus
            requiredSubmenu === "0") // wildcard: we are asking for all, but user has specific
        ) {
          // Logic based on access action:
          // A user's action (userAction) grants access if it is numerically less than or equal to
          // the required action (requiredAction).
          // Example: user has 1.0.1 (userAction = 1), wants to create (requiredAction = 3).
          // 1 <= 3 is true, so they can create.
          // Example: user has 1.0.3 (userAction = 3), wants to edit (requiredAction = 2).
          // 3 <= 2 is false, so they cannot edit.
          console.log(
            `Checking required: ${requiredPermission} against user: ${userPerm}`,
          );

          return userAction <= requiredAction;
        }
        return false;
      });
    },
    [],
  );

  // Individual permission checkers using the fetched permissions
  const canCreate = useCallback(
    (prefix: string) => checkPermissionLogic(PERMISSION_MAPPINGS.create(prefix), permissions),
    [permissions, checkPermissionLogic],
  );

  const canEdit = useCallback(
    (prefix: string) => checkPermissionLogic(PERMISSION_MAPPINGS.edit(prefix), permissions),
    [permissions, checkPermissionLogic],
  );

  const canDelete = useCallback(
    (prefix: string) => checkPermissionLogic(PERMISSION_MAPPINGS.delete(prefix), permissions),
    [permissions, checkPermissionLogic],
  );

  const canMonitor = useCallback(
    (prefix: string) => checkPermissionLogic(PERMISSION_MAPPINGS.monitor(prefix), permissions),
    [permissions, checkPermissionLogic],
  );

  const canFullAccess = useCallback(
    (prefix: string) => checkPermissionLogic(PERMISSION_MAPPINGS.delete(prefix), permissions),
    [permissions, checkPermissionLogic],
  );

  // Generic checker for any specific permission ID
  const hasPermission = useCallback(
    (requiredPermission: string) => {
      return checkPermissionLogic(requiredPermission, permissions);
    },
    [permissions, checkPermissionLogic],
  );

  return {
    permissions,
    loadingPermissions,
    error,
    canCreate,
    canEdit,
    canDelete,
    canMonitor,
    canFullAccess,
    hasPermission,
  };
};

export default usePermissions;
