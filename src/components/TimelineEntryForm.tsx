
'use client';

import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TimelineEntry, Client, Task } from '@/lib/types'; // TimelineEntry for pastEntries
import { clients as mockClients, tasks as mockTasks } from '@/data/mockData';
import { getAiSuggestionsAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

// This schema defines the shape of the form data
const formSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  client: z.string().min(1, 'Client is required.'),
  task: z.string().min(1, 'Task is required.'),
  docketNumber: z.string().optional(),
  description: z.string().min(1, 'Description is required.'),
  timeSpent: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM). Example: 01:30 for 1 hour 30 mins.'),
});

// This type is inferred from the schema and represents the form values
type TimelineFormValues = z.infer<typeof formSchema>;

interface TimelineEntryFormProps {
  // onSaveEntry expects data that matches TimelineFormValues, 
  // as it's the direct output of the form, already validated.
  // The parent component (HomePage) will then transform this into a full TimelineEntry 
  // (adding id, userId, userName) before calling the server action.
  onSaveEntry: (entryData: TimelineFormValues) => void; 
  pastEntries: TimelineEntry[]; // For AI suggestions
  entryToEdit?: TimelineEntry | null; // Full TimelineEntry for editing
  onCancelEdit?: () => void;
  userName: string; // Authenticated user's name
}

export function TimelineEntryForm({ onSaveEntry, pastEntries, entryToEdit, onCancelEdit, userName }: TimelineEntryFormProps) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [docketSuggestions, setDocketSuggestions] = useState<string[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  const [showDocketSuggestions, setShowDocketSuggestions] = useState(false);
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);

  const form = useForm<TimelineFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      client: '',
      task: '',
      docketNumber: '',
      description: '',
      timeSpent: '',
    },
  });

  useEffect(() => {
    setClients(mockClients);
    setTasks(mockTasks);
  }, []);

  useEffect(() => {
    if (entryToEdit) {
      form.reset({
        date: new Date(entryToEdit.date), // Ensure date is JS Date
        client: entryToEdit.client,
        task: entryToEdit.task,
        docketNumber: entryToEdit.docketNumber || '',
        description: entryToEdit.description,
        timeSpent: entryToEdit.timeSpent,
      });
    } else {
      form.reset({ // Default values for new entry
        date: new Date(),
        client: '',
        task: '',
        docketNumber: '',
        description: '',
        timeSpent: '',
      });
    }
  }, [entryToEdit, form]);


  const onSubmit = (values: TimelineFormValues) => {
    // `values` already has `date` as a Date object due to react-hook-form and Zod transform.
    // Pass these validated form values to the parent.
    onSaveEntry(values); 
    // Resetting form to default for new entry, or clearing edit state, is handled by useEffect above
    // or by the parent component by clearing `entryToEdit`.
  };
  
  const handleSuggestionFetch = useCallback(async (fieldType: 'docket' | 'description', currentValue: string) => {
    if (!currentValue.trim() || currentValue.length < 3) { 
      if (fieldType === 'docket') setShowDocketSuggestions(false);
      if (fieldType === 'description') setShowDescriptionSuggestions(false);
      return;
    }

    setIsSuggestionLoading(true);
    // Ensure pastEntries dates are strings if the AI expects that. Here, using description and docket.
    const stringPastEntries = pastEntries.map(e => `${e.description} (Client: ${e.client}, Task: ${e.task}, Docket: ${e.docketNumber || 'N/A'})`);
    
    try {
      const suggestions = await getAiSuggestionsAction({
        pastEntries: stringPastEntries,
        currentEntry: currentValue,
      });

      if (fieldType === 'docket') {
        setDocketSuggestions(suggestions.suggestedDocketNumbers);
        setShowDocketSuggestions(suggestions.suggestedDocketNumbers.length > 0);
      } else {
        setDescriptionSuggestions(suggestions.suggestedDescriptions);
        setShowDescriptionSuggestions(suggestions.suggestedDescriptions.length > 0);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      toast({
        title: "Suggestion Error",
        description: "Could not fetch AI suggestions.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestionLoading(false);
    }
  }, [pastEntries, toast]);
  
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'description' && value.description) {
        const handler = setTimeout(() => {
          handleSuggestionFetch('description', value.description!);
        }, 500);
        return () => clearTimeout(handler);
      } else if (name === 'description' && !value.description) {
        setShowDescriptionSuggestions(false);
      }

      if (name === 'docketNumber' && value.docketNumber) {
        const handler = setTimeout(() => {
          handleSuggestionFetch('docket', value.docketNumber!);
        }, 500);
        return () => clearTimeout(handler);
      } else if (name === 'docketNumber' && !value.docketNumber) {
         setShowDocketSuggestions(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, handleSuggestionFetch]);


  return (
    <Card className="shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold gradient-text">
          {entryToEdit ? 'Edit Timeline Entry' : 'Add New Timeline Entry'}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
            Fill in the details for your timeline. AI suggestions will appear as you type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="date" className="text-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal mt-1 bg-background border-border text-foreground hover:bg-muted',
                      !form.watch('date') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-foreground" />
                    {form.watch('date') ? format(form.watch('date'), 'MM/dd/yyyy') : <span className="text-muted-foreground">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border">
                  <Calendar
                    mode="single"
                    selected={form.watch('date')}
                    onSelect={(date) => form.setValue('date', date || new Date())} // RHF handles Date object
                    initialFocus
                    className="bg-popover text-popover-foreground"
                     classNames={{
                        day_selected: "bg-primary text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                     }}
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.date && <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>}
            </div>

            <div>
              <Label htmlFor="user" className="text-foreground">User</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="user" value={userName} readOnly className="pl-10 bg-muted/50 border-border text-foreground" />
              </div>
            </div>

            <div>
              <Label htmlFor="client" className="text-foreground">Client</Label>
              <Select onValueChange={(value) => form.setValue('client', value)} value={form.watch('client')}>
                <SelectTrigger className="w-full mt-1 bg-background border-border text-foreground hover:bg-muted">
                  <SelectValue placeholder={<span className="text-muted-foreground">Select a client</span>} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id} className="hover:bg-muted focus:bg-muted">
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.client && <p className="text-sm text-destructive mt-1">{form.formState.errors.client.message}</p>}
            </div>

            <div>
              <Label htmlFor="task" className="text-foreground">Task</Label>
              <Select onValueChange={(value) => form.setValue('task', value)} value={form.watch('task')}>
                <SelectTrigger className="w-full mt-1 bg-background border-border text-foreground hover:bg-muted">
                  <SelectValue placeholder={<span className="text-muted-foreground">Select a task</span>}/>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id} className="hover:bg-muted focus:bg-muted">
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.task && <p className="text-sm text-destructive mt-1">{form.formState.errors.task.message}</p>}
            </div>
          </div>
          
          <div className="relative">
            <Label htmlFor="docketNumber" className="text-foreground">Our Docket #</Label>
            <div className="relative mt-1">
              <Input
                id="docketNumber"
                {...form.register('docketNumber')}
                placeholder="Enter docket number (min. 3 chars for AI)"
                onFocus={() => docketSuggestions.length > 0 && setShowDocketSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDocketSuggestions(false), 150)} 
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              {isSuggestionLoading && form.watch('docketNumber') && (
                <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {showDocketSuggestions && docketSuggestions.length > 0 && (
              <Card className="absolute z-10 mt-1 w-full shadow-lg max-h-40 overflow-y-auto bg-popover border-popover-foreground">
                <CardContent className="p-2">
                  {docketSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="p-2 hover:bg-muted rounded-md cursor-pointer text-sm text-popover-foreground"
                      onMouseDown={() => { 
                        form.setValue('docketNumber', s);
                        setShowDocketSuggestions(false);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="relative">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <div className="relative mt-1">
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Describe the work done (min. 3 chars for AI)"
              rows={3}
              onFocus={() => descriptionSuggestions.length > 0 && setShowDescriptionSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDescriptionSuggestions(false), 150)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
            {isSuggestionLoading && form.watch('description') && (
                <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-muted-foreground" />
            )}
            </div>
            {showDescriptionSuggestions && descriptionSuggestions.length > 0 && (
               <Card className="absolute z-10 mt-1 w-full shadow-lg max-h-48 overflow-y-auto bg-popover border-popover-foreground">
                <CardContent className="p-2">
                  {descriptionSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="p-2 hover:bg-muted rounded-md cursor-pointer text-sm text-popover-foreground"
                      onMouseDown={() => {
                        form.setValue('description', s);
                        setShowDescriptionSuggestions(false);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {form.formState.errors.description && <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="timeSpent" className="text-foreground">Time Spent (HH:MM)</Label>
            <Input
              id="timeSpent"
              type="text" 
              placeholder="e.g., 02:30 for 2h 30m"
              className="mt-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
              {...form.register('timeSpent')}
            />
            {form.formState.errors.timeSpent && <p className="text-sm text-destructive mt-1">{form.formState.errors.timeSpent.message}</p>}
          </div>
          <div className="flex space-x-2">
            <Button type="submit" className="flex-grow bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {entryToEdit ? 'Update Entry' : 'Add Entry'}
            </Button>
            {entryToEdit && onCancelEdit && (
              <Button type="button" variant="outline" onClick={onCancelEdit} className="flex-grow-0 border-border text-foreground hover:bg-muted">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
