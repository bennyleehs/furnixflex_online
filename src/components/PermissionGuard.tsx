// components/PermissionGuard.tsx
import { ReactNode, useEffect, useState } from "react";
import { checkPermissionOnce } from "@/utils/permissionCache";

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

  useEffect(() => {
    let active = true;

    checkPermissionOnce(permissionValue).then((result) => {
      if (active) setHasPermission(result);
    });

    return () => {
      active = false;
    };
  }, [permissionValue]);

  if (hasPermission === null) return null;

  return <>{hasPermission ? children : fallback}</>;
};

export default PermissionGuard;
