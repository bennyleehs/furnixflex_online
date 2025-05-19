// src/lib/regenAccessControl.ts
import { createPool } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

const filePath = path.resolve("src/data/access_control.json");

export async function regenerateAccessControl() {
  let db;
  try {
    db = createPool();

    // 1. Read existing data
    let accessControlData: Record<string, string[]>;
    try {
      const existingContent = await fs.readFile(filePath, "utf-8");
      accessControlData = JSON.parse(existingContent);
    } catch (readError: any) {
      if (readError.code === 'ENOENT') {
        // File doesn't exist, start with empty data
        accessControlData = {};
        console.warn("access_control.json not found. Starting with an empty object.");
      } else {
        console.error("Error reading access_control.json:", readError);
        throw readError; // Re-throw to prevent regeneration with incorrect data
      }
    }
    // 2. Fetch current combinations from the database
    const [branches] = await db.execute("SELECT name, ref FROM branches2");
    const [departments] = await db.execute("SELECT name FROM departments ORDER BY id");
    const [roles] = await db.execute("SELECT name FROM roles1 ORDER BY id");
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
          currentDbKeysOriginalCase.push(originalKey); // Keep original case -> potential new entries
        }
      }
    }

    // 4. Add new database combinations -> if data not exist
    for (const originalDbKey of currentDbKeysOriginalCase) {
        const normalizedDbKey = originalDbKey.toLowerCase();
        // Check if this normalized DB key exists (case-insensitively) in the existing data
        const existingMatchingKey = Object.keys(accessControlData).find(
            k => k.toLowerCase() === normalizedDbKey
        );

        if (!existingMatchingKey) {
             // This database combination is new and doesn't exist in the JSON file
            accessControlData[originalDbKey] = []; // Add it with an empty array -> based DB combo
        }
        // If it exists, do nothing, preserving the existing access path
    }

    // 5. Remove combinations from JSON that no longer exist in the database
    const keysToRemove: string[] = [];
    for (const existingKey in accessControlData) {
         const normalizedExistingKey = existingKey.toLowerCase();
         if (!currentDbKeysNormalized.has(normalizedExistingKey)) {
              // This key exists in the JSON but not in the current database combinations
              keysToRemove.push(existingKey);
         }
    }
    keysToRemove.forEach(key => {
        delete accessControlData[key];
    });

    // 6. Write the updated (merged) data back to the file
    await fs.writeFile(filePath, JSON.stringify(accessControlData, null, 2));
    console.log("access_control.json regenerated successfully, preserving existing data and adding new combinations.");

  } catch (error) {
    console.error("Error during access_control.json regeneration:", error);
  } finally {
      if (db) {
          await db.end();
      }
  }
}