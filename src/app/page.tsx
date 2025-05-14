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
            const newUserProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              username: profileData.username || fbUser.email || 'User',
            };
            setUserProfile(newUserProfile);
          } else {
            const fallbackProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              username: fbUser.email || 'User',
            };
            setUserProfile(fallbackProfile);
          }
        } catch (error) {
          const errorProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email,
            username: fbUser.email || 'ErrorUser',
          };
          setUserProfile(errorProfile);
        }
      } else {
        if (userProfile !== null || initialFbUser === null) {
          setUserProfile(null);
          setEntries([]);
          router.push('/login');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  const fetchEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    try {
      const userEntries = await getTimelineEntriesAction();
      if (userEntries) {
        const parsedEntries = userEntries.map((entry: any) => ({
          ...entry,
          date: new Date(entry.date),
        }));
        setEntries(parsedEntries);
      } else {
        setEntries([]);
      }
    } catch (error) {
      setEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchEntries();
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