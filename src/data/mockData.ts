
import type { Client, Task } from '@/lib/types';

export const MOCK_USER_NAME = "Rohit Singh"; // This will be replaced by authenticated user's name

export const clients: Client[] = [
  { id: 'client-1', name: 'Analog Devices' },
  { id: 'client-2', name: 'Appnomics' },
  { id: 'client-3', name: 'Aura Semi' },
  { id: 'client-4', name: 'BMC' },
  { id: 'client-5', name: 'BRCD' },
  { id: 'client-6', name: 'BSTZ - IPO' },
  { id: 'client-7', name: 'BSTZ - Searches' },
  { id: 'client-8', name: 'Cradle' },
  { id: 'client-9', name: 'CHSY' },
  { id: 'client-10', name: 'DELL' },
  { id: 'client-11', name: 'EMC' },
  { id: 'client-12', name: 'Firm Internal' },
  { id: 'client-13', name: 'Gainspan' },
  { id: 'client-14', name: 'HPBB (HPTB)' },
  { id: 'client-15', name: 'ILAB' },
  { id: 'client-16', name: 'Intel - IPO' },
  { id: 'client-17', name: 'Intel - Appli' },
  { id: 'client-18', name: 'ITGY' },
  { id: 'client-19', name: 'JWTH' },
  { id: 'client-20', name: 'MYEL' },
  { id: 'client-21', name: 'NAVI' },
  { id: 'client-22', name: 'NFLX' },
  { id: 'client-23', name: 'NIMO' },
  { id: 'client-24', name: 'Nutanix - Appli' },
  { id: 'client-25', name: 'Nutanix - Searches' },
  { id: 'client-26', name: 'NWE' },
  { id: 'client-27', name: 'OFIN' },
  { id: 'client-28', name: 'Oracle - Appli' },
  { id: 'client-29', name: 'Oracle - IPO' },
  { id: 'client-30', name: 'Oracle - Searches' },
  { id: 'client-31', name: 'Oracle - COCs' },
  { id: 'client-32', name: 'OSTN' },
  { id: 'client-33', name: 'PCOI' },
  { id: 'client-34', name: 'PLBR' },
  { id: 'client-35', name: 'SLWP' },
  { id: 'client-36', name: 'SMRT' },
  { id: 'client-37', name: 'SOLI' },
  { id: 'client-38', name: 'SPCT' },
  { id: 'client-39', name: 'SVPG' },
  { id: 'client-40', name: 'Tekelec - IPO' },
  { id: 'client-41', name: 'TOTE' },
  { id: 'client-42', name: 'VMW' },
  { id: 'client-43', name: 'WBD' },
  { id: 'client-44', name: 'WDC - Searches' },
  { id: 'client-45', name: 'WILM' },
  { id: 'client-46', name: 'FOLY - Searches' },
];

export const tasks: Task[] = [
  { id: 'task-1', name: 'Specification Drafting' },
  { id: 'task-2', name: 'USPTO - Preparation of responses' },
  { id: 'task-3', name: 'USPTO - Compliance' }, // Corrected typo from USTPO
  { id: 'task-4', name: 'USPTO - Misc' },
  { id: 'task-5', name: 'IPO - Permissions' },
  { id: 'task-6', name: 'IPO - New Filings' },
  { id: 'task-7', name: 'IPO - Preparation of responses' },
  { id: 'task-8', name: 'IPO - Compliance' },
  { id: 'task-9', name: 'IPO - Appeals' },
  { id: 'task-10', name: 'IPO - Misc' },
  { id: 'task-11', name: 'Other - Filing' },
  { id: 'task-12', name: 'Other - Preparation of responses' },
  { id: 'task-13', name: 'Pre-filing Patentability' },
  { id: 'task-14', name: 'Invalidity Searches' },
  { id: 'task-15', name: 'Infringement Searches' },
  { id: 'task-16', name: 'Landscape Studies' },
  { id: 'task-17', name: 'Legal' },
  { id: 'task-18', name: 'Courts' },
  { id: 'task-19', name: 'Firm - Internal' },
];

// mockTimelineEntries is no longer exported or used directly by the app's core logic.
// Data is fetched from Firestore.
// This array can be kept for local testing or seeding if necessary.
/*
export let mockTimelineEntries: TimelineEntry[] = [
  // ... example entries ...
];
*/
