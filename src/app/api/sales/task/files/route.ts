import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { mkdirSync } from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    const getLogs = searchParams.get('logs') === 'true';
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    // Path to task directory
    const taskDir = path.join(process.cwd(), 'public', 'sales', taskId, 'upload');
    
    // Check if directory exists, create it if it doesn't
    if (!fs.existsSync(taskDir)) {
      console.log(`Creating directory for task ${taskId}`);
      mkdirSync(taskDir, { recursive: true });
      // Return empty files array since the directory was just created
      return NextResponse.json({ files: [] });
    }
    
    if (getLogs) {
      // When logs=true, return log data instead of files
      const logFilePath = path.join(taskDir, `${taskId}log.txt`);
      
      if (!fs.existsSync(logFilePath)) {
        console.log(`No log file found for task ${taskId}`);
        return NextResponse.json({ logs: [] });
      }
      
      // Read and parse log file
      const logContent = fs.readFileSync(logFilePath, 'utf-8');
      const logs = parseLogFile(logContent, taskId);
      
      return NextResponse.json({ logs });
    }
    
    // Directory exists, proceed to read files
    const fileNames = fs.readdirSync(taskDir);
    console.log('Files found in directory:', fileNames);
    
    // Filter out log files and return only regular files
    const files = fileNames
      .filter(name => !name.endsWith('log.txt'))
      .map(name => ({
        name,
        path: `/api/sales/task/download?id=${taskId}&file=${name}`,
        size: fs.statSync(path.join(taskDir, name)).size,
        type: path.extname(name).substring(1)
      }));
    
    return NextResponse.json({ files });
    
  } catch (error) {
    console.error('Error fetching files:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch files: ${errorMessage}` }, 
      { status: 500 }
    );
  }
}

/**
 * Parse log file content into structured format
 */
function parseLogFile(logContent: string, taskId: string): any[] {
  try {
    // Use the log content that's already passed in
    const content = logContent;
    
    // First check if this is the new format with multiple entries
    if (content.includes('-------------------------------')) {
      // Parse the structured log format
      const entries = content.split('-------------------------------');
      const logs = [];
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i].trim();
        if (!entry || entry.startsWith('===')) continue;
        
        const lines = entry.split('\n');
        const firstLine = lines[0];
        
        if (!firstLine) continue;
        
        // Parse timestamp and content
        const timestampMatch = firstLine.match(/\[(.*?)\]/);
        if (!timestampMatch) continue;
        
        const timestamp = timestampMatch[1];
        const rest = firstLine.substring(timestampMatch[0].length).trim();
        
        // Parse user and action
        const parts = rest.split(' - ');
        if (parts.length < 2) continue;
        
        const user = parts[0].trim();
        const actionPart = parts[1].trim();
        
        // Parse action, oldValue, newValue
        let action, oldValue = '', newValue = '';
        
        if (actionPart.includes(':')) {
          const [actionText, valuePart] = actionPart.split(':');
          action = actionText.trim();
          
          if (valuePart && valuePart.includes('→')) {
            const [oldVal, newVal] = valuePart.split('→').map(v => v.trim());
            oldValue = oldVal;
            newValue = newVal;
          } else if (valuePart) {
            newValue = valuePart.trim();
          }
        } else {
          action = actionPart;
        }
        
        // Find notes if any
        let notes = '';
        for (let j = 1; j < lines.length; j++) {
          if (lines[j].startsWith('Notes:')) {
            notes = lines[j].substring('Notes:'.length).trim();
            break;
          }
        }
        
        // Create unique ID for React key
        const uniqueId = `log-${taskId}-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Create log entry object
        logs.push({
          id: uniqueId,
          timestamp,
          user,
          action,
          oldValue,
          newValue,
          notes
        });
      }
      
      // Sort logs by timestamp, newest first
      return logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } else {
      // Fall back to a simpler format if needed
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines.map((line, index) => {
        // Basic parsing
        const timestamp = new Date().toISOString();
        
        return {
          id: `legacy-log-${taskId}-${index}-${Date.now()}`,
          timestamp,
          user: 'System',
          action: 'Log Entry',
          oldValue: '',
          newValue: '',
          notes: line,
        };
      });
    }
  } catch (error) {
    console.error('Error parsing log file:', error);
    return []; // Return empty array on error
  }
}