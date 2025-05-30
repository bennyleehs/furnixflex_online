// components/PermissionGuard.tsx
import { ReactNode, useEffect, useState, useCallback } from "react";
import { DEFAULT_ACCESS_SECTIONS } from "@/utils/defaultAccess";

interface PermissionGuardProps {
  permissionValue: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const PermissionGuard = ({
  permissionValue,
  children,
  fallback = null,
}: PermissionGuardProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Wrap isDefaultSection in useCallback
  const isDefaultSection = useCallback(async () => {
    try {
      const response = await fetch('/api/check-section-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionValue }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return DEFAULT_ACCESS_SECTIONS.includes(data.sectionName);
      }
      
      return false;
    } catch (error) {
      console.error("Error checking section type:", error);
      return false;
    }
  }, [permissionValue]);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // First check if this is a default access section
        const isDefault = await isDefaultSection();
        
        if (isDefault) {
          setHasPermission(true);
          setLoading(false);
          return;
        }
        
        // Otherwise check against user role permissions
        const response = await fetch("/api/check-permission", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ permissionValue }),
        });

        if (response.ok) {
          const data = await response.json();
          setHasPermission(data.hasPermission);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error("Permission check error:", error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionValue, isDefaultSection]); // Add isDefaultSection to dependencies

  if (loading) {
    // While checking permission, you can show a loading state or nothing
    return null;
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default PermissionGuard;