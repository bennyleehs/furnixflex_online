// src/hooks/usePermissions.ts
import { useEffect, useState } from 'react';
import { getCookie } from 'cookies-next';

const usePermissions = () => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    const fetchTokenAndPermissions = async () => {
      setLoadingPermissions(true);
      const tokenString = await getCookie('authToken'); // Use await

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

    fetchTokenAndPermissions(); // Call the async function
  }, []);

  const canCreate = (menu: string, submenu: string): boolean => {
    console.log('canCreate: Loading permissions?', loadingPermissions);
    console.log('canCreate: Current permissions state:', permissions);
    console.log('canCreate: Checking prefix:', `${menu}.${submenu}.`);

    if (loadingPermissions) {
      console.log('canCreate: Permissions are still loading, returning false.');
      return false;
    }

    if (!permissions || !Array.isArray(permissions)) {
      console.log('canCreate: Permissions not available or not array.');
      return false;
    }

    const relevantPermissions = permissions.filter((perm) =>
      perm.startsWith(`${menu}.${submenu}.`)
    );

    console.log('canCreate: Relevant permissions after filter:', relevantPermissions);

    return relevantPermissions.some((perm) => {
      const actionDigit = parseInt(perm.split('.')[2], 10);
      console.log(`canCreate: Checking perm ${perm}: action digit ${actionDigit}`);
      return actionDigit >= 1 && actionDigit <= 3;
    });
  };

  return { canCreate, loadingPermissions };
};

export default usePermissions;