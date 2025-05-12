import type { Client, Task } from '@/lib/types';

export const MOCK_USER_NAME = "Rohit Singh";

export const clients: Client[] = [
  { id: 'client-1', name: 'Innovatech Corp' },
  { id: 'client-2', name: 'Quantum Solutions' },
  { id: 'client-3', name: 'Synergy Ltd' },
  { id: 'client-4', name: 'Apex Innovations' },
  { id: 'client-5', name: 'Starlight Ventures' },
];

export const tasks: Task[] = [
  { id: 'task-1', name: 'Development' },
  { id: 'task-2', name: 'Meeting (Client)' },
  { id: 'task-3', name: 'Meeting (Internal)' },
  { id: 'task-4', name: 'Research & Analysis' },
  { id: 'task-5', name: 'Documentation' },
  { id: 'task-6', name: 'Project Management' },
  { id: 'task-7', name: 'UI/UX Design' },
];
