"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import usePermissions from "@/hooks/usePermissions";

// Static route-to-permission mapping: route prefix → "MENU.SUBMENU"
// Ordered longest-first so sub-routes match before parent routes.
const ROUTE_PERMISSION_MAP: { route: string; menu: string; submenu: string }[] =
  [
    // Admin sub-pages
    { route: "/admin/branch", menu: "1", submenu: "1" },
    { route: "/admin/department", menu: "1", submenu: "2" },
    { route: "/admin/role", menu: "1", submenu: "3" },
    { route: "/admin/employee", menu: "1", submenu: "4" },
    { route: "/admin/clock", menu: "1", submenu: "5" },
    { route: "/admin/scopes_access", menu: "1", submenu: "6" },
    { route: "/admin/properties", menu: "1", submenu: "7" },
    { route: "/admin/equipment", menu: "1", submenu: "8" },
    { route: "/admin/inventory", menu: "1", submenu: "9" },
    { route: "/admin/partners", menu: "1", submenu: "10" },
    { route: "/admin/partner", menu: "1", submenu: "10" },
    // Sales sub-pages
    { route: "/sales/product", menu: "2", submenu: "1" },
    { route: "/sales/lead", menu: "2", submenu: "2" },
    { route: "/sales/task", menu: "2", submenu: "3" },
    { route: "/sales/quotation", menu: "2", submenu: "4" },
    { route: "/sales/payment", menu: "2", submenu: "5" },
    // Production sub-pages
    { route: "/production/parts", menu: "3", submenu: "1" },
    { route: "/production/modular", menu: "3", submenu: "2" },
    // Finance sub-pages
    { route: "/finance/indoor", menu: "4", submenu: "1" },
    { route: "/finance/measurement", menu: "4", submenu: "2" },
    { route: "/finance/dealer", menu: "4", submenu: "3" },
  ];

// Routes that any authenticated user can access (no permission check needed)
const PUBLIC_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/attendance",
  "/admin", // admin landing page
  "/sales", // sales landing page (if it exists as a standalone page)
];

function getRequiredPermission(pathname: string) {
  // Check if it's a public route (exact match or starts with + next char is / or end)
  for (const pub of PUBLIC_ROUTES) {
    if (pathname === pub || pathname === pub + "/") {
      return null; // No permission needed
    }
  }

  // Find the matching route permission (longest prefix match)
  for (const entry of ROUTE_PERMISSION_MAP) {
    if (pathname === entry.route || pathname.startsWith(entry.route + "/")) {
      return { menu: entry.menu, submenu: entry.submenu };
    }
  }

  return null; // Route not in map → allow access (e.g. dashboard sub-pages)
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canMonitor, loadingPermissions, error: permError } = usePermissions();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loadingPermissions) return;

    // If permissions failed to load, allow access as fallback
    // (the page-level guards will still deny actions)
    if (permError) {
      console.error("RouteGuard: Permission fetch failed, allowing navigation:", permError);
      setAuthorized(true);
      return;
    }

    const required = getRequiredPermission(pathname);

    if (!required) {
      // No permission needed for this route
      setAuthorized(true);
      return;
    }

    // canMonitor checks for action level 4 (read-only), which is the minimum access
    const hasAccess = canMonitor(required.menu, required.submenu);
    setAuthorized(hasAccess);

    if (!hasAccess) {
      console.warn(
        `Access denied: route "${pathname}" requires permission ${required.menu}.${required.submenu}`,
      );
    }
  }, [pathname, loadingPermissions, canMonitor, permError]);

  // Still loading permissions
  if (loadingPermissions || authorized === null) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  // Access denied
  if (!authorized) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-20">
        <div className="mb-6 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <svg
            className="h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-black dark:text-white">
          Access Denied
        </h2>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          You do not have permission to access this page.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-md bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
