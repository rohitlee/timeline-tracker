
'use client';

import { useState } from 'react';
import { format, isAfter as dfIsAfter, isBefore as dfIsBefore, isEqual as dfIsEqual, startOfDay } from 'date-fns';
import { CalendarIcon, Download, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import type { TimelineEntry } from '@/lib/types';
import { MOCK_USER_NAME, clients as mockClients, tasks as mockTasks } from '@/data/mockData'; // For mapping IDs to names
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ExportTimelineButtonProps {
  entries: TimelineEntry[];
}

type ExportFormat = 'csv' | 'tsv';

export function ExportTimelineButton({ entries }: ExportTimelineButtonProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
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
      formatType === 'csv' ? `"${entry.description.replace(/"/g, '""')}"` : entry.description, // Description
      entry.timeSpent // Time Spent
    ].join(delimiter));

    return [headers, ...rows].join('\n');
  };

  const handleExport = () => {
    if (startDate && endDate && dfIsAfter(startOfDay(startDate), startOfDay(endDate))) {
      toast({
        title: "Invalid Date Range",
        description: "Start date cannot be after end date.",
        variant: "destructive",
      });
      return;
    }

    let filteredEntries = entries;

    if (startDate || endDate) {
      filteredEntries = entries.filter(entry => {
        const entryDate = startOfDay(new Date(entry.date));
        const sDate = startDate ? startOfDay(startDate) : null;
        const eDate = endDate ? startOfDay(endDate) : null;

        if (sDate && eDate) {
          return (dfIsEqual(entryDate, sDate) || dfIsAfter(entryDate, sDate)) &&
                 (dfIsEqual(entryDate, eDate) || dfIsBefore(entryDate, eDate));
        }
        if (sDate) {
          return dfIsEqual(entryDate, sDate) || dfIsAfter(entryDate, sDate);
        }
        if (eDate) {
          return dfIsEqual(entryDate, eDate) || dfIsBefore(entryDate, eDate);
        }
        return true; // Should not happen if startDate or endDate is defined
      });
    }


    if (filteredEntries.length === 0) {
      toast({
        title: "No Data",
        description: "There are no entries to export for the selected criteria.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatData(filteredEntries, exportFormat);
    const blob = new Blob([formattedData], { type: exportFormat === 'csv' ? 'text/csv;charset=utf-8;' : 'text/tab-separated-values;charset=utf-8;' });
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `${todayStr} ${MOCK_USER_NAME}.${exportFormat === 'csv' ? 'csv' : 'txt'}`;
    
    const link = document.createElement('a');
    if (link.download !== undefined) { 
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

  const clearDateRange = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    toast({
      title: "Date Range Cleared",
      description: "Export will include all entries.",
    });
  };

  return (
    <div className="mt-8 p-6 bg-card rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Export Timeline</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="startDate"
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal mt-1',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'MM/dd/yyyy') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="endDate"
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal mt-1',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'MM/dd/yyyy') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => startDate ? dfIsBefore(date, startDate) : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {(startDate || endDate) && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearDateRange}
          className="mb-4 w-full sm:w-auto"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Clear Date Range
        </Button>
      )}

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

