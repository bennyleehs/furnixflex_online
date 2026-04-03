// src/lib/regenAccessControl.ts
import { getPool } from "@/lib/db";
import { promises as fs } from "fs";
import { PoolConnection } from "mysql2/promise";
import { getAccessControlFilePath } from "@/Sidemenu/loader";

export async function regenerateAccessControl(countryCode: string = "my") {
  const filePath = getAccessControlFilePath(countryCode);
  let connection: PoolConnection | undefined;
  try {
    const pool = await getPool();
    connection = await pool.getConnection();

    // 1. Read existing data
    let accessControlData: Record<string, string[]>;
    try {
      const existingContent = await fs.readFile(filePath, "utf-8");
      accessControlData = JSON.parse(existingContent);
      console.log("2. Existing access_control.json read successfully.");
    } catch (readError: any) {
      if (readError.code === 'ENOENT') {
        accessControlData = {};
        console.warn("2. access_control.json not found. Starting with an empty object.");
      } else {
        console.error("2. Error reading access_control.json:", readError);
        throw readError;
      }
    }

    // 2. Fetch current combinations from the database - ORDER BY id
    const [branches] = await connection.execute("SELECT name, ref FROM branches ORDER BY id");
    const [departments] = await connection.execute("SELECT name FROM departments ORDER BY id");
    const [roles] = await connection.execute("SELECT name FROM roles ORDER BY id");
    const slicedRoles = (roles as any[]).slice(1);

    // 3. Create a map of current database keys (normalized for comparison)
    const currentDbKeysNormalized = new Set<string>();
    const currentDbKeysOriginalCase: string[] = [];

    for (const branch of branches as any[]) {
      for (const department of departments as any[]) {
        for (const role of slicedRoles) {
          const originalKey = `${branch.ref}.${department.name}.${role.name}`;
          const normalizedKey = originalKey.toLowerCase();
          currentDbKeysNormalized.add(normalizedKey);
          currentDbKeysOriginalCase.push(originalKey);
        }
      }
    }

    // 4. Add new database combinations and update existing ones (if names changed)
    // temp obj - to hold the structure
    const newAccessControlData: Record<string, string[]> = {};

    // First, add all current DB combinations, preserving existing permissions
    // and ensuring new ones are initialized.
    for (const originalDbKey of currentDbKeysOriginalCase) {
        const normalizedDbKey = originalDbKey.toLowerCase();
        // Find if this key (case-insensitively) exists in the old data
        const existingMatchingKey = Object.keys(accessControlData).find(
            k => k.toLowerCase() === normalizedDbKey
        );

        if (existingMatchingKey) {
            // If it exists, use its permissions, but use the new originalDbKey for consistency
            newAccessControlData[originalDbKey] = accessControlData[existingMatchingKey];
        } else {
            // If it's a new combination, initialize with an empty array
            newAccessControlData[originalDbKey] = [];
        }
    }

    // 5. Sort the keys of the new object before writing
    const sortedKeys = Object.keys(newAccessControlData).sort(); // Alphabetical sort

    const finalAccessControlData: Record<string, string[]> = {};
    for (const key of sortedKeys) {
        finalAccessControlData[key] = newAccessControlData[key];
    }

    // 6. Write the updated (merged and sorted) data back to the file
    await fs.writeFile(filePath, JSON.stringify(finalAccessControlData, null, 2));
    console.log("access_control.json regenerated successfully, preserving existing data and adding new combinations in sorted order.");

  } catch (error) {
    console.error("CRITICAL ERROR during access_control.json regeneration:", error);
  } finally {
      if (connection) {
        connection.release();
        console.log("Released connection back to pool for regenerateAccessControl.");
      }
  }
}