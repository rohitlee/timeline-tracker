
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimelineEntry } from '@/lib/types';
import { MOCK_USER_NAME, clients as mockClients, tasks as mockTasks } from '@/data/mockData'; // For mapping IDs to names
import { useToast } from '@/hooks/use-toast';

interface ExportTimelineButtonProps {
  entries: TimelineEntry[];
}

type ExportFormat = 'csv' | 'tsv';

export function ExportTimelineButton({ entries }: ExportTimelineButtonProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const { toast } = useToast();

  const getClientName = (clientId: string) => mockClients.find(c => c.id === clientId)?.name || clientId;
  const getTaskName = (taskId: string) => mockTasks.find(t => t.id === taskId)?.name || taskId;

  const formatData = (data: TimelineEntry[], formatType: ExportFormat): string => {
    const delimiter = formatType === 'csv' ? ',' : '\t';
    const headers = ['Date', 'Type', 'Name', 'Client', 'Task', 'Our Docket #', 'Description', 'Time Spent'].join(delimiter);
    
    const rows = data.map(entry => [
      format(new Date(entry.date), 'MM/dd/yyyy'), // Date format MM/dd/yyyy
      'Time', // Hardcoded 'Type' as "Time"
      entry.userName, // Name (User Name)
      getClientName(entry.client), // Client
      getTaskName(entry.task), // Task
      entry.docketNumber || '', // Our Docket #
      // Ensure description is safe for CSV/TSV (e.g., escape quotes if CSV)
      formatType === 'csv' ? `"${entry.description.replace(/"/g, '""')}"` : entry.description, // Description
      entry.timeSpent // Time Spent
    ].join(delimiter));

    return [headers, ...rows].join('\n');
  };

  const handleExport = () => {
    if (entries.length === 0) {
      toast({
        title: "No Data",
        description: "There are no entries to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatData(entries, exportFormat);
    const blob = new Blob([formattedData], { type: exportFormat === 'csv' ? 'text/csv;charset=utf-8;' : 'text/tab-separated-values;charset=utf-8;' });
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `${todayStr} ${MOCK_USER_NAME}.${exportFormat === 'csv' ? 'csv' : 'txt'}`;
    
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: `Timeline exported as ${filename}`,
      });
    } else {
       toast({
        title: "Export Failed",
        description: "Your browser does not support direct downloads.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-8 p-6 bg-card rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-foreground">Export Timeline</h3>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Select value={exportFormat} onValueChange={(value: string) => setExportFormat(value as ExportFormat)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV (Comma-separated)</SelectItem>
            <SelectItem value="tsv">TSV (Tab-separated)</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleExport} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground flex-grow sm:flex-grow-0">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>
    </div>
  );
}

