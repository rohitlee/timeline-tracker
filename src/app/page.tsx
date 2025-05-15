// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TimeWiseHeader } from '@/components/TimeWiseHeader';
import { TimelineEntryForm } from '@/components/TimelineEntryForm';
import { TimelineCalendarView } from '@/components/TimelineCalendarView';
import { ExportTimelineButton } from '@/components/ExportTimelineButton';
import type { TimelineEntry, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { clients as mockClients, tasks as mockTasks } from '@/data/mockData';
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

import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth as firebaseAuth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc, // Import updateDoc
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { z } from 'zod';

const formSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  client: z.string().min(1, 'Client is required.'),
  task: z.string().min(1, 'Task is required.'),
  docketNumber: z.string().optional(),
  description: z.string().min(1, 'Description is required.'),
  timeSpent: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM). Example: 01:30 for 1 hour 30 mins.'),
});
type TimelineFormValues = z.infer<typeof formSchema>;


export default function HomePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimelineEntry | null>(null); // This holds the full entry being edited, including its ID
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(() => new Date());
  const { toast } = useToast();

  // ... (useEffect for onAuthStateChanged - no changes here) ...
  useEffect(() => {
    setIsMounted(true);
    const initialFbUser = firebaseAuth.currentUser;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            setUserProfile({
              uid: fbUser.uid,
              email: fbUser.email,
              username: profileData.username || fbUser.email || 'User',
            });
          } else {
            setUserProfile({
              uid: fbUser.uid,
              email: fbUser.email,
              username: fbUser.email || 'User',
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile({ 
            uid: fbUser.uid,
            email: fbUser.email,
            username: fbUser.email || 'ErrorUser',
          });
        }
      } else {
        if (userProfile !== null || initialFbUser === null) {
            setUserProfile(null);
            setEntries([]); 
            router.push('/login');
        }
      }
    });
    return () => unsubscribe();
  }, [router]);


  const fetchEntriesClientSide = useCallback(async () => {
    if (!firebaseAuth.currentUser) {
      setEntries([]); 
      setIsLoadingEntries(false);
      return;
    }
    setIsLoadingEntries(true);
    try {
      const q = query(
        collection(db, `users/${firebaseAuth.currentUser.uid}/timelineEntries`),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedEntries = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        date: (docSnap.data().date as Timestamp).toDate(),
      })) as TimelineEntry[];
      setEntries(fetchedEntries);
    } catch (error) {
      console.error("Error fetching timeline entries client-side:", error);
      toast({
        title: "Error Fetching Entries",
        description: "Could not load your timeline entries.",
        variant: "destructive",
      });
      setEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userProfile && firebaseAuth.currentUser) {
      fetchEntriesClientSide();
    } else if (!firebaseAuth.currentUser && isMounted) {
        setEntries([]);
        setIsLoadingEntries(false);
    }
  }, [userProfile, fetchEntriesClientSide, isMounted]);


  const handleSaveEntry = async (entryDataFromForm: TimelineFormValues) => {
    if (!firebaseAuth.currentUser || !userProfile) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    const validation = formSchema.safeParse(entryDataFromForm);
    if (!validation.success) {
        toast({ title: "Invalid Data", description: validation.error.errors.map(e => e.message).join(', '), variant: "destructive" });
        return;
    }
    const validatedData = validation.data;

    // Prepare the data structure for Firestore. This is common for both add and update.
    const dataToSaveForFirestore = {
      ...validatedData,
      // userId and userName are already part of the entry if editing, or added if new
      // For update, we don't need to re-set userId or userName if they are unchanged
      // but it's harmless to include them if they are part of validatedData implicitly or explicitly
      date: Timestamp.fromDate(validatedData.date), // Convert JS Date to Firestore Timestamp
    };


    try {
      if (entryToEdit && entryToEdit.id) {
        // ----- UPDATE Existing Entry -----
        const entryDocRef = doc(db, `users/${firebaseAuth.currentUser.uid}/timelineEntries`, entryToEdit.id);
        // Only update the fields that came from the form. userId and userName remain from original entry.
        await updateDoc(entryDocRef, {
            ...dataToSaveForFirestore // This includes date, client, task, docketNumber, description, timeSpent
        });
        toast({
          title: "Entry Updated",
          description: "Your timeline entry has been successfully updated.",
        });
      } else {
        // ----- ADD New Entry -----
        const entryForCreation: Omit<TimelineEntry, 'id'> = {
          ...validatedData, // Contains date, client, task, docketNumber, description, timeSpent
          userId: firebaseAuth.currentUser.uid,
          userName: userProfile.username,
          date: Timestamp.fromDate(validatedData.date),
        };
        await addDoc(
          collection(db, `users/${firebaseAuth.currentUser.uid}/timelineEntries`),
          entryForCreation
        );
        toast({
          title: "Entry Added",
          description: "Your timeline entry has been successfully added.",
        });
      }
      
      fetchEntriesClientSide(); // Re-fetch entries to show the new/updated one
      setEntryToEdit(null); // Clear edit state in both cases

    } catch (error) {
      console.error("Error saving timeline entry client-side:", error);
      toast({
        title: "Save Failed",
        description: `Could not ${entryToEdit ? 'update' : 'add'} the entry. Check console for details.`,
        variant: "destructive",
      });
    }
  };

  const handleEditRequest = (entry: TimelineEntry) => {
    // When requesting an edit, store the full entry object, including its ID.
    // Ensure the date is a JS Date object for the form.
    setEntryToEdit({ ...entry, date: new Date(entry.date) });
  };

  // ... (handleCancelEdit, requestDelete, confirmDelete, cancelDelete, getClientName, getTaskName, loader, JSX return) ...
  // No changes needed for the rest of the component for this specific update logic.
  // The existing handleCancelEdit, requestDelete, etc., should continue to work.

  const handleCancelEdit = () => {
    setEntryToEdit(null);
  };

  const requestDelete = (entryId: string) => {
    setDeleteCandidateId(entryId);
  };

  const confirmDelete = async () => {
    if (!firebaseAuth.currentUser || !deleteCandidateId) {
      toast({ title: "Error", description: "Cannot delete entry.", variant: "destructive" });
      setDeleteCandidateId(null);
      return;
    }

    try {
      await deleteDoc(doc(db, `users/${firebaseAuth.currentUser.uid}/timelineEntries`, deleteCandidateId));
      fetchEntriesClientSide(); 
      setDeleteCandidateId(null);
      toast({ title: "Entry Deleted", description: "The timeline entry has been deleted." });
    } catch (error) {
      console.error("Error deleting timeline entry client-side:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the entry.",
        variant: "destructive",
      });
      setDeleteCandidateId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteCandidateId(null);
  };

  const getClientName = (clientId: string) => mockClients.find(c => c.id === clientId)?.name || clientId;
  const getTaskName = (taskId: string) => mockTasks.find(t => t.id === taskId)?.name || taskId;

  if (!isMounted || !userProfile) { 
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
      <TimeWiseHeader userName={userProfile.username} />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <TimelineEntryForm
              onSaveEntry={handleSaveEntry} 
              pastEntries={filteredPastEntries}
              entryToEdit={entryToEdit}
              onCancelEdit={handleCancelEdit}
              userName={userProfile.username}
            />
            <ExportTimelineButton entries={entries} userName={userProfile.username} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <TimelineCalendarView
              entries={entries}
              currentMonth={currentCalendarMonth}
              onMonthChange={setCurrentCalendarMonth}
            />
            <Card className="shadow-lg bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-accent">Recent Entries</CardTitle>
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
        © {new Date().getFullYear()} TimeWise - Built with ❤️
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