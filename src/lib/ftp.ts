import * as fs from 'fs';
import * as path from 'path';
import { mkdir } from 'fs/promises';

// Use project-relative path for storage
const BASE_DIR = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'src', 'data', 'sales', 'task');

// Add this to ensure the directory exists at startup
try {
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    console.log(`Created base storage directory: ${BASE_DIR}`);
  } else {
    console.log(`Using existing storage directory: ${BASE_DIR}`);
  }
} catch (error) {
  console.error(`Error creating storage directory ${BASE_DIR}:`, error);
  // Continue execution - the adapter will handle errors when operations are attempted
}

// Local file system adapter that mimics FTP client interface
class LocalFileAdapter {
  private currentDirectory: string;

  constructor() {
    // Start at the base directory
    this.currentDirectory = BASE_DIR;
  }

  // Get current directory
  async pwd(): Promise<string> {
    return this.currentDirectory;
  }

  // Change directory
  async cd(directoryPath: string): Promise<void> {
    // Handle absolute vs relative paths
    const targetPath = path.isAbsolute(directoryPath) 
      ? directoryPath 
      : path.join(this.currentDirectory, directoryPath);
    
    // Check if directory exists
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Directory does not exist: ${targetPath}`);
    }
    
    // Verify it's a directory
    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${targetPath}`);
    }
    
    // Update current directory
    this.currentDirectory = targetPath;
  }

  // List directory contents
  async list(): Promise<{ name: string; type: string; size: number; date: string }[]> {
    const files = fs.readdirSync(this.currentDirectory);
    
    return files.map(fileName => {
      const filePath = path.join(this.currentDirectory, fileName);
      const stats = fs.statSync(filePath);
      
      return {
        name: fileName,
        type: stats.isDirectory() ? 'd' : '-',
        size: stats.size,
        date: stats.mtime.toISOString()
      };
    });
  }

  // Create directory
  async send(command: string): Promise<void> {
    // Only handle MKD commands for directory creation
    if (command.startsWith('MKD ')) {
      const dirName = command.substring(4);
      const dirPath = path.join(this.currentDirectory, dirName);
      
      try {
        fs.mkdirSync(dirPath, { recursive: true });
      } catch (error) {
        throw new Error(`Failed to create directory: ${dirPath}`);
      }
    } else {
      throw new Error(`Unsupported command: ${command}`);
    }
  }

  // Upload file
  async uploadFrom(localFilePath: string, remoteFileName: string): Promise<void> {
    const destinationPath = path.join(this.currentDirectory, remoteFileName);
    
    try {
      fs.copyFileSync(localFilePath, destinationPath);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      } else {
        throw new Error(`Failed to upload file: ${String(error)}`);
      }
    }
  }

  // Download file
  async downloadTo(localFilePath: string, remoteFileName: string): Promise<void> {
    const sourcePath = path.join(this.currentDirectory, remoteFileName);
    
    try {
      fs.copyFileSync(sourcePath, localFilePath);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to download file: ${error.message}`);
      } else {
        throw new Error(`Failed to download file: ${String(error)}`);
      }
    }
  }

  // Remove file
  async remove(fileName: string): Promise<void> {
    const filePath = path.join(this.currentDirectory, fileName);
    
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to remove file: ${error.message}`);
      } else {
        throw new Error(`Failed to remove file: ${String(error)}`);
      }
    }
  }

  // Close connection (no-op for local files)
  close(): void {
    // Nothing to do for local files
  }
}

// Replacement for withFtpClient that uses local file system
export async function withFtpClient<T>(operation: (client: LocalFileAdapter) => Promise<T>): Promise<T> {
  const client = new LocalFileAdapter();
  try {
    return await operation(client);
  } finally {
    client.close();
  }
}

// Find a writable directory (simplified for local storage)
export async function findWritableDirectory(): Promise<string> {
  // Ensure the base directory exists
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  }
  return BASE_DIR;
}

// Create directory structure
export async function createDirectoryStructure(segments: string[]): Promise<string> {
  return withFtpClient(async (client) => {
    let currentPath = await client.pwd();
    
    for (const segment of segments) {
      if (!segment) continue;
      
      try {
        try {
          await client.cd(segment);
          console.log(`Directory exists: ${segment}`);
        } catch (cdError) {
          console.log(`Creating directory: ${segment}`);
          await client.send(`MKD ${segment}`);
          await client.cd(segment);
        }
        
        currentPath = await client.pwd();
      } catch (error) {
        console.error(`Failed at directory: ${segment}`, error);
        throw error;
      }
    }
    
    return currentPath;
  });
}

// Upload file
export async function uploadFile(
  localFilePath: string,
  remoteDirectory: string,
  fileName?: string
): Promise<string> {
  return withFtpClient(async (client) => {
    const actualFileName = fileName || path.basename(localFilePath);
    
    try {
      // Navigate to the directory
      await client.cd(remoteDirectory);
      
      // Upload the file
      await client.uploadFrom(localFilePath, actualFileName);
      
      // Return the path
      const currentDir = await client.pwd();
      return `${currentDir}/${actualFileName}`;
    } catch (error) {
      console.error(`Error uploading ${localFilePath}:`, error);
      throw error;
    }
  });
}

// Log to file
export async function logToFile(
  directoryPath: string,
  content: string
): Promise<void> {
  return withFtpClient(async (client) => {
    const tempFile = path.join(process.cwd(), 'temp', `temp_log_${Date.now()}.txt`);
    
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.dirname(tempFile);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write content to temp file
      fs.writeFileSync(tempFile, content);
      
      // Navigate to directory
      await client.cd(directoryPath);
      
      // Upload the file
      await client.uploadFrom(tempFile, 'log.txt');
    } catch (error) {
      console.error('Error writing to log file:', error);
      throw error;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
}
