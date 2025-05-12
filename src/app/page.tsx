
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
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { MOCK_USER_NAME, clients as mockClients, tasks as mockTasks } from '@/data/mockData';
import { Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { getTimelineEntriesAction } from '@/lib/actions'; // Import the server action

export default function HomePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimelineEntry | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const { toast } = useToast();

  // Fetch entries from server action on mount
  useEffect(() => {
    setIsMounted(true);
    const fetchEntries = async () => {
      const userEntries = await getTimelineEntriesAction();
      if (userEntries) {
         const parsedEntries = userEntries.map((entry: any) => ({
          ...entry,
          date: new Date(entry.date), // Ensure date is a Date object
        }));
        setEntries(parsedEntries);
      }
    };
    fetchEntries();
  }, []);


  // Save entries to localStorage whenever they change (can be removed if full server-side persistence)
  useEffect(() => {
    if (isMounted) { 
      localStorage.setItem('timelineEntries', JSON.stringify(entries.map(e => ({...e, date: e.date.toISOString() }))));
    }
  }, [entries, isMounted]);

  const handleSaveEntry = (savedEntry: TimelineEntry) => {
    const isUpdate = entries.some(e => e.id === savedEntry.id);
    setEntries(prevEntries => {
      const updatedEntries = isUpdate 
        ? prevEntries.map(e => e.id === savedEntry.id ? savedEntry : e)
        : [{ ...savedEntry, date: new Date(savedEntry.date) }, ...prevEntries]; // Ensure date is Date object
      return updatedEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    setEntryToEdit(null); // Clear editing state
    toast({
      title: isUpdate ? "Entry Updated" : "Entry Added",
      description: `Your timeline entry has been successfully ${isUpdate ? 'updated' : 'added'}.`,
    });
  };

  const handleEditRequest = (entry: TimelineEntry) => {
    setEntryToEdit(entry);
  };

  const handleCancelEdit = () => {
    setEntryToEdit(null);
  };

  const requestDelete = (entryId: string) => {
    setDeleteCandidateId(entryId);
  };

  const confirmDelete = () => {
    if (deleteCandidateId) {
      setEntries(prevEntries => prevEntries.filter(e => e.id !== deleteCandidateId));
      setDeleteCandidateId(null);
      toast({
        title: "Entry Deleted",
        description: "The timeline entry has been deleted.",
      });
    }
  };

  const cancelDelete = () => {
    setDeleteCandidateId(null);
  };

  const getClientName = (clientId: string) => mockClients.find(c => c.id === clientId)?.name || clientId;
  const getTaskName = (taskId: string) => mockTasks.find(t => t.id === taskId)?.name || taskId;

  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TimeWiseHeader />
        <main className="container mx-auto p-4 md:p-8 flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card><CardHeader><CardTitle className="gradient-text">Loading Form...</CardTitle></CardHeader><CardContent><div className="h-96 bg-muted animate-pulse rounded-md"></div></CardContent></Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <Card><CardHeader><CardTitle className="gradient-text">Loading Calendar...</CardTitle></CardHeader><CardContent><div className="h-80 bg-muted animate-pulse rounded-md"></div></CardContent></Card>
              <Card><CardHeader><CardTitle className="gradient-text">Loading Recent Entries...</CardTitle></CardHeader><CardContent><div className="h-60 bg-muted animate-pulse rounded-md"></div></CardContent></Card>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  const filteredPastEntries = entries.filter(e => !entryToEdit || e.id !== entryToEdit.id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TimeWiseHeader />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <TimelineEntryForm 
              onSaveEntry={handleSaveEntry} 
              pastEntries={filteredPastEntries}
              entryToEdit={entryToEdit}
              onCancelEdit={handleCancelEdit}
              userName={MOCK_USER_NAME} // Pass mock user name
            />
            <ExportTimelineButton entries={entries} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <TimelineCalendarView 
              entries={entries} 
              currentMonth={currentCalendarMonth}
              onMonthChange={setCurrentCalendarMonth}
            />
            <Card className="shadow-lg bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold gradient-text">Recent Entries</CardTitle>
                <CardDescription className="text-muted-foreground">Your last 5 timeline entries. You can edit or delete them.</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-muted-foreground">No entries yet. Add your first one!</p>
                ) : (
                  <ScrollArea className="h-72">
                    <ul className="space-y-4 pr-4">
                      {entries.slice(0, 5).map(entry => (
                        <li key={entry.id} className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-foreground">{entry.description}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">{format(new Date(entry.date), 'MM/dd/yyyy')}</Badge>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditRequest(entry)}>
                                <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                <span className="sr-only">Edit entry</span>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => requestDelete(entry.id)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                <span className="sr-only">Delete entry</span>
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Client: <span className="font-medium text-foreground/80">{getClientName(entry.client)}</span> | 
                            Task: <span className="font-medium text-foreground/80">{getTaskName(entry.task)}</span>
                          </p>
                          {entry.docketNumber && <p className="text-sm text-muted-foreground">Docket: <span className="font-medium text-foreground/80">{entry.docketNumber}</span></p>}
                          <p className="text-sm text-muted-foreground">Time Spent: <span className="font-medium text-foreground/80">{entry.timeSpent}</span></p>
                           <p className="text-sm text-muted-foreground">User: <span className="font-medium text-foreground/80">{entry.userName || MOCK_USER_NAME}</span></p>
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
      <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border mt-8">
        © {new Date().getFullYear()} TimeWise - Built with Firebase Studio
      </footer>

      {deleteCandidateId && (
        <AlertDialog open={!!deleteCandidateId} onOpenChange={(open) => !open && cancelDelete()}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This action cannot be undone. This will permanently delete the timeline entry.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete} className="text-foreground border-border hover:bg-muted">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
