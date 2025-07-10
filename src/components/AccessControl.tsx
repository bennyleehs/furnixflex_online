//src/components/AccessControl.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AccessControlProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AccessControl({
  children,
  fallback,
}: AccessControlProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/check-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: pathname }),
        });

        if (!res.ok) {
          throw new Error("Failed to check access");
        }

        const data = await res.json();
        setHasAccess(data.hasAccess);

        // If no access, redirect to home
        if (!data.hasAccess && pathname !== "/") {
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [pathname, router]);

  if (isLoading) {
    return <div>Loading...</div>; // Or your loading component
  }

  if (hasAccess === false) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
