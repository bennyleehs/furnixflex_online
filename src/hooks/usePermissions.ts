// src/hooks/usePermissions.ts
import { useState, useEffect, useCallback } from 'react';

// Define permission mapping based on your action numbers:
// These map to the *specific* permission ID for that action type.
// The `checkPermissionLogic` will then determine if a user's actual permission
// (e.g., 1.0.1) grants access to this required action (e.g., 1.0.3).
const PERMISSION_MAPPINGS = {
    'create': (menu: string, submenu: string) => `${menu}.${submenu}.3`, // Requires X.Y.3 or higher (i.e., 1, 2, or 3)
    'edit': (menu: string, submenu: string) => `${menu}.${submenu}.2`,   // Requires X.Y.2 or higher (i.e., 1 or 2)
    'delete': (menu: string, submenu: string) => `${menu}.${submenu}.1`, // Requires X.Y.1 (full access)
    'monitor': (menu: string, submenu: string) => `${menu}.${submenu}.4`, // Requires X.Y.4 or higher (i.e., 1, 2, 3, or 4)
};

interface UsePermissionsResult {
    permissions: string[];
    loadingPermissions: boolean;
    error: string | null;
    canCreate: (menu: string, submenu: string) => boolean;
    canEdit: (menu: string, submenu: string) => boolean;
    canDelete: (menu: string, submenu: string) => boolean;
    canMonitor: (menu: string, submenu: string) => boolean;
    canFullAccess: (menu: string, submenu: string) => boolean; // For checking if user has full access (action 1)
    hasPermission: (requiredPermission: string) => boolean; // Generic checker for any permission ID
}

const usePermissions = (): UsePermissionsResult => {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                setLoadingPermissions(true);
                // Make the API call to your new endpoint to fetch permissions
                const res = await fetch('/api/permissions');
                if (!res.ok) {
                    if (res.status === 401) {
                        setError('Unauthorized: Please log in.');
                        // Optionally, redirect to login page if token is truly invalid/expired
                        // window.location.href = '/login';
                    } else {
                        throw new Error(`Failed to fetch permissions: ${res.statusText}`);
                    }
                }
                const data = await res.json();
                setPermissions(data.permissions || []);
            } catch (err: any) {
                console.error("Error in usePermissions hook:", err);
                setError(err.message || "Failed to load permissions.");
                setPermissions([]); // Ensure permissions are empty on error
            } finally {
                setLoadingPermissions(false);
            }
        };

        fetchPermissions();
    }, []); // Empty dependency array means this runs once on component mount

    /**
     * Helper to check if a required permission is granted by the user's permissions,
     * considering the hierarchical nature of your action numbers (1 > 2 > 3 > 4).
     * @param requiredPermission The permission string being checked (e.g., "1.0.3" for create).
     * @param userPerms The array of permissions the user actually has (e.g., ["1.0.1", "2.0.1"]).
     * @returns True if the user has the required permission or a higher-level permission that grants it.
     */
    const checkPermissionLogic = useCallback((requiredPermission: string, userPerms: string[]): boolean => {
        if (!userPerms || userPerms.length === 0) return false;

        const requiredParts = requiredPermission.split('.');
        if (requiredParts.length !== 3) {
            console.warn(`Invalid required permission format: ${requiredPermission}. Expected 'MENU.SUBMENU.ACTION'.`);
            return false;
        }
        const requiredMenu = requiredParts[0];
        const requiredSubmenu = requiredParts[1];
        const requiredAction = parseInt(requiredParts[2], 10);

        if (isNaN(requiredAction) || requiredAction < 1 || requiredAction > 4) {
            console.warn(`Invalid required action number: ${requiredParts[2]}. Expected 1, 2, 3, or 4.`);
            return false;
        }

        // Iterate through the user's actual permissions
        return userPerms.some(userPerm => {
            const userParts = userPerm.split('.');
            if (userParts.length !== 3) {
                // console.warn(`Invalid user permission format: ${userPerm}`); // Can be chatty, uncomment for debugging
                return false;
            }
            const userMenu = userParts[0];
            const userSubmenu = userParts[1];
            const userAction = parseInt(userParts[2], 10);

            if (isNaN(userAction) || userAction < 1 || userAction > 4) {
                // console.warn(`Invalid user action number: ${userParts[2]}`); // Can be chatty, uncomment for debugging
                return false;
            }

            // Check if menu and submenu match
            if (requiredMenu === userMenu && requiredSubmenu === userSubmenu) {
                // Logic based on your definition:
                // A user's action (userAction) grants access if it is numerically less than or equal to
                // the required action (requiredAction).
                // Example: user has 1.0.1 (userAction = 1), wants to create (requiredAction = 3).
                // 1 <= 3 is true, so they can create.
                // Example: user has 1.0.3 (userAction = 3), wants to edit (requiredAction = 2).
                // 3 <= 2 is false, so they cannot edit.
                return userAction <= requiredAction;
            }
            return false;
        });
    }, []);

    // Individual permission checkers using the fetched permissions
    const canCreate = useCallback((menu: string, submenu: string) => {
        const required = PERMISSION_MAPPINGS.create(menu, submenu); // Target is X.Y.3
        return checkPermissionLogic(required, permissions);
    }, [permissions, checkPermissionLogic]);

    const canEdit = useCallback((menu: string, submenu: string) => {
        const required = PERMISSION_MAPPINGS.edit(menu, submenu); // Target is X.Y.2
        return checkPermissionLogic(required, permissions);
    }, [permissions, checkPermissionLogic]);

    const canDelete = useCallback((menu: string, submenu: string) => {
        const required = PERMISSION_MAPPINGS.delete(menu, submenu); // Target is X.Y.1
        return checkPermissionLogic(required, permissions);
    }, [permissions, checkPermissionLogic]);

    const canMonitor = useCallback((menu: string, submenu: string) => {
        const required = PERMISSION_MAPPINGS.monitor(menu, submenu); // Target is X.Y.4
        return checkPermissionLogic(required, permissions);
    }, [permissions, checkPermissionLogic]);

    // This checks if the user has the highest level of access (action 1) for a given menu/submenu.
    const canFullAccess = useCallback((menu: string, submenu: string) => {
        const required = PERMISSION_MAPPINGS.delete(menu, submenu); // Action 1 is the 'full access' level
        return checkPermissionLogic(required, permissions);
    }, [permissions, checkPermissionLogic]);

    // Generic checker for any specific permission ID
    const hasPermission = useCallback((requiredPermission: string) => {
        return checkPermissionLogic(requiredPermission, permissions);
    }, [permissions, checkPermissionLogic]);

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