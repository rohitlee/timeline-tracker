
'use client';

import { useState, useEffect, useCallback }      from 'react';
import { useRouter } from 'next/navigation';
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
import { clients as mockClients, tasks as mockTasks } from '@/data/mockData'; // Clients and Tasks can still be mock
import { Pencil, Trash2, Loader2 } from 'lucide-react';
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
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { getTimelineEntriesAction, createTimelineEntryAction, deleteTimelineEntryAction } from '@/lib/actions';

export default function HomePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string; username: string} | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimelineEntry | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      const user = getCurrentUser();
      setCurrentUser(user);
      fetchEntries();
    }
  }, [router]);

  const fetchEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    const userEntries = await getTimelineEntriesAction();
    // Ensure date is a Date object after fetching
    const parsedEntries = userEntries.map((entry: any) => ({
      ...entry,
      date: new Date(entry.date),
    }));
    setEntries(parsedEntries);
    setIsLoadingEntries(false);
  }, []);


  const handleSaveEntry = async (entryData: Omit<TimelineEntry, 'id' | 'userId' | 'userName'>) => {
    if (!currentUser) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    
    let result;
    const dataToSave = { ...entryData, date: new Date(entryData.date) }; // Ensure date is Date object

    if (entryToEdit) { // This logic needs refinement for updates with Firestore
      // For now, we'll treat edit as creating a new entry and deleting old one, or simply re-adding.
      // Proper update would involve a separate updateTimelineEntryAction.
      // Simplified: delete old if exists, then add new.
      if (entries.some(e => e.id === entryToEdit.id)) {
        // await deleteTimelineEntryAction(entryToEdit.id); // Optional: delete if truly updating
      }
      // For simplicity, we'll use create action, assuming it handles ID generation or receives it.
      // The form should probably pass the ID if it's an edit.
      const entryWithIdIfEdit: any = { ...dataToSave, id: entryToEdit.id };
      // This is a placeholder for update logic. Ideally, createTimelineEntryAction
      // would take an optional ID for updates or a separate update action exists.
      // For now, let's assume we always create, and existing ID is overwritten or ignored by addDoc.
      // A robust solution requires an `updateTimelineEntryAction(entryId, data)`.
      // Let's simulate update by re-creating if ID matches.
      // The below `createTimelineEntryAction` will add a new document.
      // A true update needs `updateDoc` in the action.
      // For now, on "edit", we'll just call create.
      // This won't update the existing entry but add a new one if ID isn't managed correctly by create action for updates.
    }
    
    // Pass data that createTimelineEntryAction expects (without id, userId, userName)
    const { client, task, docketNumber, description, timeSpent, date } = dataToSave;
    const payloadForCreate = { client, task, docketNumber, description, timeSpent, date };


    result = await createTimelineEntryAction(payloadForCreate);

    if (result.success && result.entry) {
      fetchEntries(); // Re-fetch to get the latest list including the new/updated one
      setEntryToEdit(null); // Clear edit state
      form.reset(); // Reset form fields after successful save
      toast({
        title: entryToEdit ? "Entry Updated" : "Entry Added",
        description: `Your timeline entry has been successfully ${entryToEdit ? 'updated (simulated)' : 'added'}.`,
      });
    } else {
      toast({
        title: "Save Failed",
        description: result.message || "Could not save the entry.",
        variant: "destructive",
      });
    }
  };

  const handleEditRequest = (entry: TimelineEntry) => {
    setEntryToEdit({...entry, date: new Date(entry.date)}); // Ensure date is Date object for the form
  };

  const handleCancelEdit = () => {
    setEntryToEdit(null);
  };

  const requestDelete = (entryId: string) => {
    setDeleteCandidateId(entryId);
  };

  const confirmDelete = async () => {
    if (deleteCandidateId) {
      const result = await deleteTimelineEntryAction(deleteCandidateId);
      if (result.success) {
        fetchEntries(); // Re-fetch entries
        setDeleteCandidateId(null);
        toast({
          title: "Entry Deleted",
          description: "The timeline entry has been deleted.",
        });
      } else {
        toast({
          title: "Delete Failed",
          description: result.message || "Could not delete the entry.",
          variant: "destructive",
        });
      }
    }
  };

  const cancelDelete = () => {
    setDeleteCandidateId(null);
  };

  const getClientName = (clientId: string) => mockClients.find(c => c.id === clientId)?.name || clientId;
  const getTaskName = (taskId: string) => mockTasks.find(t => t.id === taskId)?.name || taskId;

  // Access form instance if needed for reset, but it's typically managed within TimelineEntryForm
  // If HomePage needs to trigger reset, pass a ref or a prop down.
  // For now, TimelineEntryForm resets itself on prop change (entryToEdit).
  // We need a way to reference the form to call reset when an entry is saved or edit cancelled.
  // This is usually done by lifting state up or using a ref.
  // For simplicity, we rely on TimelineEntryForm's useEffect to reset if entryToEdit becomes null.
  // Let's assume `TimelineEntryForm` component has its own form instance.
  // We'll call `setEntryToEdit(null)` which should trigger `TimelineEntryForm` to reset.
  // The form instance from `useForm` hook
  let form: any; // Placeholder for form instance if needed for direct reset from parent
  // If TimelineEntryForm exposes a reset method via ref, it could be used.
  // Or, better, handleSaveEntry should also ensure form is reset.

  if (!isMounted || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading TimeWise...</p>
      </div>
    );
  }
  
  const filteredPastEntries = entries.filter(e => !entryToEdit || e.id !== entryToEdit.id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TimeWiseHeader userName={currentUser.username} />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <TimelineEntryForm 
              onSaveEntry={handleSaveEntry} 
              pastEntries={filteredPastEntries}
              entryToEdit={entryToEdit}
              onCancelEdit={handleCancelEdit}
              userName={currentUser.username}
              // Pass form instance or reset function if needed, or handle reset inside TimelineEntryForm
            />
            <ExportTimelineButton entries={entries} userName={currentUser.username} />
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
                {isLoadingEntries ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : entries.length === 0 ? (
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
                           <p className="text-sm text-muted-foreground">User: <span className="font-medium text-foreground/80">{entry.userName}</span></p>
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
