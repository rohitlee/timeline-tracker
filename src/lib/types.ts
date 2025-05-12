export interface TimelineEntry {
  id: string;
  date: Date;
  userId: string;
  client: string; // Store client ID
  task: string;   // Store task ID
  userName: string;
  docketNumber?: string;
  description: string;
  timeSpent: string; // hh:mm format, e.g., "01:30"
}

export interface Client {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  name: string;
}
