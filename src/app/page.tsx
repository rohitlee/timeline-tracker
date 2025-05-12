'use client';

import { useState, useEffect } from 'react';
import { TimeWiseHeader } from '@/components/TimeWiseHeader';
import { TimelineEntryForm } from '@/components/TimelineEntryForm';
import { TimelineCalendarView } from '@/components/TimelineCalendarView';
import { ExportTimelineButton } from '@/components/ExportTimelineButton';
import type { TimelineEntry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MOCK_USER_NAME, clients as mockClients, tasks as mockTasks } from '@/data/mockData';


export default function HomePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load entries from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const storedEntries = localStorage.getItem('timelineEntries');
    if (storedEntries) {
      try {
        const parsedEntries = JSON.parse(storedEntries).map((entry: any) => ({
          ...entry,
          date: new Date(entry.date), // Ensure date is a Date object
        }));
        setEntries(parsedEntries);
      } catch (error) {
        console.error("Error parsing stored entries:", error);
        localStorage.removeItem('timelineEntries'); // Clear corrupted data
      }
    }
  }, []);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    if (isMounted) { // Only run after initial mount to avoid SSR/localStorage mismatch
      localStorage.setItem('timelineEntries', JSON.stringify(entries));
    }
  }, [entries, isMounted]);

  const handleAddEntry = (newEntry: TimelineEntry) => {
    setEntries(prevEntries => [newEntry, ...prevEntries].sort((a,b) => b.date.getTime() - a.date.getTime()));
  };

  const getClientName = (clientId: string) => mockClients.find(c => c.id === clientId)?.name || clientId;
  const getTaskName = (taskId: string) => mockTasks.find(t => t.id === taskId)?.name || taskId;


  // Skeleton for recent entries while loading from localStorage
  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <TimeWiseHeader />
        <main className="container mx-auto p-4 md:p-8 flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card><CardHeader><CardTitle>Loading Form...</CardTitle></CardHeader><CardContent><div className="h-96 bg-muted animate-pulse rounded-md"></div></CardContent></Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <Card><CardHeader><CardTitle>Loading Calendar...</CardTitle></CardHeader><CardContent><div className="h-80 bg-muted animate-pulse rounded-md"></div></CardContent></Card>
              <Card><CardHeader><CardTitle>Loading Recent Entries...</CardTitle></CardHeader><CardContent><div className="h-60 bg-muted animate-pulse rounded-md"></div></CardContent></Card>
            </div>
          </div>
        </main>
      </div>
    );
  }
  

  return (
    <div className="min-h-screen flex flex-col">
      <TimeWiseHeader />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <TimelineEntryForm onAddEntry={handleAddEntry} pastEntries={entries} />
            <ExportTimelineButton entries={entries} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <TimelineCalendarView entries={entries} />
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Recent Entries</CardTitle>
                <CardDescription>Your last 5 timeline entries.</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-muted-foreground">No entries yet. Add your first one!</p>
                ) : (
                  <ScrollArea className="h-72">
                    <ul className="space-y-4 pr-4">
                      {entries.slice(0, 5).map(entry => (
                        <li key={entry.id} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-foreground">{entry.description}</h4>
                            <Badge variant="secondary" className="text-xs">{format(entry.date, 'dd MMM yyyy')}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Client: <span className="font-medium text-foreground/80">{getClientName(entry.client)}</span> | 
                            Task: <span className="font-medium text-foreground/80">{getTaskName(entry.task)}</span>
                          </p>
                          {entry.docketNumber && <p className="text-sm text-muted-foreground">Docket: <span className="font-medium text-foreground/80">{entry.docketNumber}</span></p>}
                          <p className="text-sm text-muted-foreground">Time Spent: <span className="font-medium text-foreground/80">{entry.timeSpent}</span></p>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t mt-8">
        © {new Date().getFullYear()} TimeWise - Built with Firebase Studio
      </footer>
    </div>
  );
}
