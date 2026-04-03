import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { getPool } from "@/lib/db";
import { getCountryFromRequest } from "@/utils/countryDetect";

export const dynamic = "force-dynamic";

// Clear interface definition for EventLog
interface EventLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  notes?: string; // User notes/messages only
  filesName?: string[]; // File names stored separately
}

// Save event log with clear separation between notes and files
async function saveEventLog(taskId: string, log: EventLog, country: string = "my") {
  try {
    // Create directory structure if it doesn't exist
    const taskDir = path.join(
      process.cwd(),
      "public",
      country,
      "sales",
      taskId,
      "upload",
    );
    await fs.mkdir(taskDir, { recursive: true });

    // Define log file path
    const logFilePath = path.join(taskDir, `${taskId}log.txt`);

    // Format log entry with clear section separators
    let logEntry = `[${log.timestamp}] ${log.user} - ${log.action}`;

    if (log.oldValue || log.newValue) {
      logEntry += `: ${log.oldValue || ""} → ${log.newValue || ""}`;
    }

    logEntry += "\n";

    // Notes section - only if present
    if (log.notes && log.notes.trim()) {
      logEntry += `Notes: ${log.notes.trim()}\n`;
    }

    // Files section - only if present
    if (log.filesName && log.filesName.length > 0) {
      logEntry += `Files: ${log.filesName.join(", ")}\n`;
    }

    // Add separator - IMPORTANT: use at least 10 hyphens to match the client-side regex
    logEntry += `----------------------------------------\n`;

    // Write to file
    try {
      await fs.access(logFilePath);
      await fs.appendFile(logFilePath, logEntry);
    } catch (error) {
      await fs.writeFile(
        logFilePath,
        `=== Task #${taskId} Event Log ===\n\n----------------------------------------\n${logEntry}`,
      );
    }

    console.log(`Log saved to ${logFilePath}`);
    return true;
  } catch (error) {
    console.error("Error saving event log:", error);
    return false;
  }
}

// Handle file upload
async function saveFile(taskId: string, file: File, country: string = "my") {
  try {
    const taskDir = path.join(
      process.cwd(),
      "public",
      country,
      "sales",
      taskId,
      "upload",
    );
    await fs.mkdir(taskDir, { recursive: true });

    // Ensure filename is unique
    let fileName = file.name;
    const filePath = path.join(taskDir, fileName);

    if (existsSync(filePath)) {
      const extIndex = fileName.lastIndexOf(".");
      const nameWithoutExt =
        extIndex !== -1 ? fileName.substring(0, extIndex) : fileName;
      const ext = extIndex !== -1 ? fileName.substring(extIndex) : "";
      fileName = `${nameWithoutExt}_${Date.now()}${ext}`;
    }

    // Save file to disk
    const finalPath = path.join(taskDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(finalPath, buffer);

    return fileName;
  } catch (error) {
    console.error("Error saving file:", error);
    throw error;
  }
}

// Parse log file content into structured EventLog objects
function parseLogFile(content: string): EventLog[] {
  try {
    // Split by the section separator - matches 10 or more hyphens
    const entries = content
      .split(/\-{10,}/)
      .filter((entry) => entry.trim() !== "" && !entry.startsWith("==="));

    const logs: EventLog[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i].trim();
      if (!entry) continue;

      const lines = entry
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) continue;

      // Parse first line for timestamp, user, action
      const mainLine = lines[0];
      const timestampMatch = mainLine.match(/\[(.*?)\]/);
      if (!timestampMatch) continue;

      const timestamp = timestampMatch[1];
      const afterTimestamp = mainLine
        .substring(timestampMatch[0].length)
        .trim();

      const parts = afterTimestamp.split(" - ");
      if (parts.length < 2) continue;

      const user = parts[0].trim();
      const actionPart = parts[1].trim();

      // Parse action and values
      let action = actionPart;
      let oldValue = "";
      let newValue = "";

      if (actionPart.includes(":")) {
        const [actionText, valuePart] = actionPart.split(":");
        action = actionText.trim();

        if (valuePart && valuePart.includes("→")) {
          const [oldVal, newVal] = valuePart.split("→").map((v) => v.trim());
          oldValue = oldVal;
          newValue = newVal;
        } else if (valuePart) {
          newValue = valuePart.trim();
        }
      }

      // Keep notes and files completely separate
      let notes: string | undefined = undefined;
      let filesName: string[] | undefined = undefined;

      // Extract notes and files from separate lines
      for (let j = 1; j < lines.length; j++) {
        if (lines[j].startsWith("Notes:")) {
          const notesText = lines[j].substring("Notes:".length).trim();
          notes = notesText || undefined;
        } else if (lines[j].startsWith("Files:")) {
          const filesText = lines[j].substring("Files:".length).trim();
          if (filesText) {
            filesName = filesText
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean);
          }
        }
      }

      logs.push({
        id: `log-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp,
        user,
        action,
        oldValue: oldValue || undefined,
        newValue: newValue || undefined,
        notes,
        filesName,
      });
    }

    // Sort logs by timestamp (newest first)
    return logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  } catch (error) {
    console.error("Error parsing log file:", error);
    return [];
  }
}

// GET handler to retrieve logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 },
      );
    }

    // Path to task directory
    const country = getCountryFromRequest(request);
    const taskDir = path.join(
      process.cwd(),
      "public",
      country,
      "sales",
      taskId,
      "upload",
    );

    // Define log file path
    const logFilePath = path.join(taskDir, `${taskId}log.txt`);

    try {
      await fs.access(logFilePath);
    } catch {
      console.log(`No log file found for task ${taskId}`);
      return NextResponse.json({ logs: [] });
    }

    // Check if log file exists
    if (!existsSync(logFilePath)) {
      console.log(`No log file found for task ${taskId}`);
      return NextResponse.json({ logs: [] });
    }

    // Read and parse log file
    // FIX: Use 'await fs.readFile' instead of 'readFileSync'
    // This prevents blocking and handles rapid read-after-write better
    const logContent = await fs.readFile(logFilePath, "utf-8");
    const logs = parseLogFile(logContent);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error reading logs:", error);
    return NextResponse.json({ error: "Failed to read logs" }, { status: 500 });
  }
}

// Add function to update task status in database
// async function updateTaskInDatabase(taskId: string, newStatus: string) {
//   try {
//     const conn = getPool();

//     // Update the task status in the customer1 table
//     const [result] = await conn.execute(
//       'UPDATE customers SET status = ?, updated_at = NOW() WHERE id = ?',
//       [newStatus, taskId]
//     );
//     console.log(`Database updated: Task #${taskId} status set to "${newStatus}"`);
//     return true;
//   } catch (error) {
//     console.error('Error updating database:', error);
//     throw new Error('Failed to update task status in database');
//   }
// }

// POST handler for task updates and file uploads
export async function POST(request: NextRequest) {
  try {
    const country = getCountryFromRequest(request);
    const formData = await request.formData();

    // Extract form data
    const taskId = formData.get("id") as string;
    const newStatus = formData.get("status") as string;
    const oldStatus = formData.get("oldStatus") as string;
    const followUpStatus = formData.get("followUp_status") as string;
    const notes = formData.get("notes") as string;
    const userName = (formData.get("userName") as string) || "System";

    // Get files from form data
    const files = formData.getAll("files") as File[];
    console.log(`Updating task ${taskId} from ${oldStatus} to ${newStatus}`);

    // Only update database if status actually changed
    // if (newStatus !== oldStatus) {
    //   await updateTaskInDatabase(taskId, newStatus);
    // }

    // Process file uploads - completely separate from notes
    const uploadedFiles = [];

    for (const file of files) {
      const fileName = await saveFile(taskId, file, country);
      uploadedFiles.push(fileName);
    }

    // log entry for Follow Up
    const logValueDisplay = followUpStatus
      ? `${newStatus} (${followUpStatus})`
      : newStatus;

    // Create log entry with strict separation
    const logEntry: EventLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: userName,
      action: "Status Update",
      oldValue: oldStatus,
      newValue: logValueDisplay,
      notes: notes?.trim() ? notes.trim() : undefined, // Only include notes if they exist and aren't empty
      filesName: uploadedFiles.length > 0 ? uploadedFiles : undefined, // Only include filesName if files were uploaded
    };

    await saveEventLog(taskId, logEntry, country);

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
      files: uploadedFiles,
      followUp_status: followUpStatus,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update task", message: errorMessage },
      { status: 500 },
    );
  }
}
