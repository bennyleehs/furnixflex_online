// utils/permissionCache.ts
import { DEFAULT_ACCESS_SECTIONS } from "@/utils/defaultAccess";

let permissionPromise: Promise<string[]> | null = null;
const permissionCache = new Map<string, Promise<boolean>>();

export async function fetchPermissionsOnce(): Promise<string[]> {
  if (permissionPromise) return permissionPromise;

  permissionPromise = fetch("/api/permissions")
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to fetch permissions");
      const data = await res.json();
      return data.permissions || [];
    })
    .catch((err) => {
      console.error("Permission fetch error:", err);
      permissionPromise = null;
      return [];
    });

  return permissionPromise;
}

export async function checkPermissionOnce(permissionValue: string): Promise<boolean> {
  if (permissionCache.has(permissionValue)) {
    return permissionCache.get(permissionValue)!;
  }

  const permissionPromise = (async () => {
    try {
      const sectionRes = await fetch("/api/check-section-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionValue }),
      });

      if (sectionRes.ok) {
        const data = await sectionRes.json();
        if (DEFAULT_ACCESS_SECTIONS.includes(data.sectionName)) {
          return true;
        }
      }

      const permRes = await fetch("/api/check-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionValue }),
      });

      if (permRes.ok) {
        const data = await permRes.json();
        return data.hasPermission;
      }

      return false;
    } catch (err) {
      console.error("Permission check error:", err);
      return false;
    }
  })();

  permissionCache.set(permissionValue, permissionPromise);
  return permissionPromise;
}
