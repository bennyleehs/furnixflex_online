// Define the event log interface
export interface EventLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
  filesName?: string[]; // Array of file names attached to this log entry
}