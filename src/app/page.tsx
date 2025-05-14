'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TimeWiseHeader } from '@/components/TimeWiseHeader';
import { TimelineEntryForm } from '@/components/TimelineEntryForm';
import { TimelineCalendarView } from '@/components/TimelineCalendarView';
import { ExportTimelineButton } from '@/components/ExportTimelineButton';
import type { TimelineEntry, UserProfile } from '@/lib/types'; // Ensure UserProfile is imported
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
import { getTimelineEntriesAction, createTimelineEntryAction, deleteTimelineEntryAction } from '@/lib/actions';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'; // Firebase SDK
import { auth as firebaseAuth, db } from '@/lib/firebase'; // Firebase SDK instances
import { doc, getDoc } from 'firebase/firestore'; // Firestore SDK

export default function HomePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimelineEntry | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(() => new Date());
  const { toast } = useToast();

  console.log('[HomePage] Component rendering. isMounted:', isMounted, 'userProfile:', userProfile ? userProfile.uid : 'null');

  useEffect(() => {
    console.log('[HomePage] Auth useEffect running.');
    setIsMounted(true); // Set mounted early

    // Check initial currentUser state synchronously; Firebase might have it ready
    const initialFbUser = firebaseAuth.currentUser;
    console.log('[HomePage] Initial firebaseAuth.currentUser (at time of effect run):', initialFbUser ? initialFbUser.uid : 'null');

    console.log('[HomePage] Subscribing to onAuthStateChanged.');
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
      console.log('[HomePage] onAuthStateChanged Fired! fbUser from listener:', fbUser ? fbUser.uid : 'null');

      if (fbUser) {
        // User is authenticated according to the listener
        console.log('[HomePage] fbUser detected by listener. UID:', fbUser.uid);
        const userDocRef = doc(db, 'users', fbUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            const newUserProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email, // fbUser.email should be non-null if fbUser is not null
              username: profileData.username || fbUser.email || 'User',
            };
            console.log('[HomePage] Setting userProfile from listener:', newUserProfile);
            setUserProfile(newUserProfile); // This will trigger the other useEffect to fetch entries
          } else {
            console.warn(`[HomePage] User profile NOT found in Firestore (listener) for UID: ${fbUser.uid}.`);
            const fallbackProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              username: fbUser.email || 'User',
            };
            console.log('[HomePage] Setting userProfile to fallback (listener):', fallbackProfile);
            setUserProfile(fallbackProfile);
          }
        } catch (error) {
            console.error("[HomePage] Error fetching user document (listener):", error);
            const errorProfile: UserProfile = { // Provide a basic profile to prevent total app breakage
              uid: fbUser.uid,
              email: fbUser.email,
              username: fbUser.email || 'ErrorUser',
            };
            setUserProfile(errorProfile);
        }
      } else {
        // No user from listener (fbUser is null)
        // This means Firebase has confirmed no active session or a logout occurred.
        console.log('[HomePage] No fbUser from listener. User is signed out or session expired.');
        // Only redirect if we are not already in a state of having no user,
        // or if initialFbUser was also null (meaning it's not just a pending state).
        // This logic helps prevent redirect loops if onAuthStateChanged fires multiple times with null initially.
        if (userProfile !== null || initialFbUser === null) { // If userProfile was set OR initial check was also null
          console.log('[HomePage] -> Conditions met for resetting state and redirecting to login. Current userProfile:', userProfile ? userProfile.uid : 'null', 'InitialFbUser:', initialFbUser ? initialFbUser.uid : 'null' );
          setUserProfile(null);
          setEntries([]); // Clear entries
          // Check current path before pushing to avoid redundant navigation or errors if already unmounting/navigating
          // Note: router.pathname might not be available in App Router's useRouter directly.
          // For simplicity, we assume redirection is generally safe if conditions are met.
          // A more robust check might involve window.location.pathname if really needed, but often not.
          router.push('/login');
        } else {
          console.log('[HomePage] -> No fbUser from listener, but userProfile is already null and initialFbUser was (likely) not null. Waiting for auth state to settle or already handled.');
        }
      }
    });

    return () => {
      console.log('[HomePage] Auth useEffect cleanup - Unsubscribing from onAuthStateChanged.');
      unsubscribe();
    };
  }, [router]); // Dependency: router (for router.push).

  const fetchEntries = useCallback(async () => {
    // No need to check userProfile here, the calling useEffect does it.
    console.log('[HomePage] fetchEntries called. isLoadingEntries currently:', isLoadingEntries);
    setIsLoadingEntries(true);
    try {
      const userEntries = await getTimelineEntriesAction();
      console.log('[HomePage] fetchEntries - got entries from action:', userEntries ? userEntries.length : 'undefined/error');
      if (userEntries) { // Check if userEntries is not undefined (e.g. if action failed gracefully)
        const parsedEntries = userEntries.map((entry: any) => ({
          ...entry,
          date: new Date(entry.date),
        }));
        setEntries(parsedEntries);
      } else {
        setEntries([]); // Set to empty if action returned undefined/null
      }
    } catch (error) {
        console.error("[HomePage] Error in fetchEntries (try-catch):", error);
        setEntries([]); // Clear entries on error
    } finally {
        setIsLoadingEntries(false);
        console.log('[HomePage] fetchEntries - finished. setIsLoadingEntries to false.');
    }
  }, []); // This useCallback has no external dependencies changing its definition.

  useEffect(() => {
    console.log('[HomePage] userProfile/fetchEntries useEffect triggered. userProfile:', userProfile ? userProfile.uid : 'null');
    if (userProfile) {
      console.log('[HomePage] userProfile is present, calling fetchEntries.');
      fetchEntries();
    } else {
      console.log('[HomePage] userProfile is null, not calling fetchEntries (in userProfile effect).');
    }
  }, [userProfile, fetchEntries]);


  const handleSaveEntry = async (entryData: Omit<TimelineEntry, 'id' | 'userId' | 'userName'>) => {
    if (!userProfile) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    const dataToSave = { ...entryData, date: new Date(entryData.date) };
    const { client, task, docketNumber, description, timeSpent, date } = dataToSave;
    const payloadForCreate = { client, task, docketNumber, description, timeSpent, date };

    const result = await createTimelineEntryAction(payloadForCreate);

    if (result.success && result.entry) {
      fetchEntries();
      setEntryToEdit(null);
      toast({
        title: entryToEdit ? "Entry Updated (Simulated)" : "Entry Added",
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
    setEntryToEdit({ ...entry, date: new Date(entry.date) });
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
        fetchEntries();
        setDeleteCandidateId(null);
        toast({ title: "Entry Deleted", description: "The timeline entry has been deleted." });
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

  if (!isMounted || !userProfile) {
    console.log('[HomePage] RENDERING LOADING SCREEN. isMounted:', isMounted, 'userProfile:', userProfile ? userProfile.uid : 'null');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading TimeWise...</p>
      </div>
    );
  }
  console.log('[HomePage] RENDERING MAIN CONTENT. userProfile UID:', userProfile.uid);

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