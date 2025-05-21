// src/hooks/usePermissions.ts
import { useEffect, useState } from 'react';
import { getCookie } from 'cookies-next';

const usePermissions = () => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    const fetchTokenAndPermissions = async () => {
      setLoadingPermissions(true);
      const tokenString = await getCookie('authToken');

      console.log('usePermissions useEffect: Token from cookie:', tokenString);

      if (tokenString) {
        try {
          const base64Url = tokenString.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const tokenData = JSON.parse(jsonPayload);
          const fetchedPermissions = tokenData?.permissions || [];
          setPermissions(fetchedPermissions);
          console.log('usePermissions useEffect: Fetched and set permissions:', fetchedPermissions);
        } catch (error) {
          console.error('usePermissions useEffect: Error decoding token:', error);
          setPermissions([]);
        } finally {
          setLoadingPermissions(false);
          console.log('usePermissions useEffect: Loading finished. loadingPermissions:', false, 'permissions:', permissions);
        }
      } else {
        setPermissions([]);
        setLoadingPermissions(false);
        console.log('usePermissions useEffect: No authToken found in cookie');
      }
    };

    fetchTokenAndPermissions();
  }, []);

  const checkPermissionByAction = (menu: string, submenu: string, actionCodes: number[]): boolean => {
    if (loadingPermissions || !permissions || !Array.isArray(permissions)) {
      return false;
    }

    return permissions.some((perm) => {
      if (perm.startsWith(`${menu}.${submenu}.`)) {
        const actionDigit = parseInt(perm.split('.')[2], 10);
        return actionCodes.includes(actionDigit);
      }
      return false;
    });
  };

  const canFullAccess = (menu: string, submenu: string): boolean => {
    return checkPermissionByAction(menu, submenu, [1]);
  };

  const canEdit = (menu: string, submenu: string): boolean => {
    return checkPermissionByAction(menu, submenu, [1, 2]);
  };

  const canCreate = (menu: string, submenu: string): boolean => {
    return checkPermissionByAction(menu, submenu, [1, 2, 3]);
  };

  const canMonitor = (menu: string, submenu: string): boolean => {
    return checkPermissionByAction(menu, submenu, [4]);
  };

  return { canFullAccess, canEdit, canCreate, canMonitor, loadingPermissions };
};

export default usePermissions;