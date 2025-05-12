
'use client';

import type { FormEvent} from 'react';
import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TimelineEntry, Client, Task } from '@/lib/types';
import { MOCK_USER_NAME, clients as mockClients, tasks as mockTasks } from '@/data/mockData';
import { getAiSuggestionsAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  client: z.string().min(1, 'Client is required.'),
  task: z.string().min(1, 'Task is required.'),
  docketNumber: z.string().optional(),
  description: z.string().min(1, 'Description is required.'),
  timeSpent: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM). Example: 01:30 for 1 hour 30 mins.'),
});

type TimelineFormValues = z.infer<typeof formSchema>;

interface TimelineEntryFormProps {
  onSaveEntry: (entry: TimelineEntry) => void;
  pastEntries: TimelineEntry[];
  entryToEdit?: TimelineEntry | null;
  onCancelEdit?: () => void;
}

export function TimelineEntryForm({ onSaveEntry, pastEntries, entryToEdit, onCancelEdit }: TimelineEntryFormProps) {
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
    // In a real app, these would be fetched from an API
    setClients(mockClients);
    setTasks(mockTasks);
  }, []);

  useEffect(() => {
    if (entryToEdit) {
      form.reset({
        date: new Date(entryToEdit.date),
        client: entryToEdit.client,
        task: entryToEdit.task,
        docketNumber: entryToEdit.docketNumber || '',
        description: entryToEdit.description,
        timeSpent: entryToEdit.timeSpent,
      });
    } else {
      form.reset({
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
    const newEntry: TimelineEntry = {
      id: entryToEdit ? entryToEdit.id : Date.now().toString(),
      userName: MOCK_USER_NAME,
      ...values,
    };
    onSaveEntry(newEntry);
    // Form reset is handled by useEffect watching entryToEdit prop change in parent
  };

  const handleSuggestionFetch = useCallback(async (fieldType: 'docket' | 'description', currentValue: string) => {
    if (!currentValue.trim() || currentValue.length < 3) { 
      if (fieldType === 'docket') setShowDocketSuggestions(false);
      if (fieldType === 'description') setShowDescriptionSuggestions(false);
      return;
    }

    setIsSuggestionLoading(true);
    // Use the pastEntries prop which is already filtered in HomePage
    const stringPastEntries = pastEntries.map(e => `${e.description} (Docket: ${e.docketNumber || 'N/A'})`);
    
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
    const descriptionValue = form.watch('description');
    if (descriptionValue) {
      const handler = setTimeout(() => {
        handleSuggestionFetch('description', descriptionValue);
      }, 500);
      return () => clearTimeout(handler);
    } else {
      setShowDescriptionSuggestions(false);
    }
  }, [form.watch('description'), handleSuggestionFetch]);

  useEffect(() => {
    const docketValue = form.watch('docketNumber');
    if (docketValue) {
      const handler = setTimeout(() => {
        handleSuggestionFetch('docket', docketValue);
      }, 500);
      return () => clearTimeout(handler);
    } else {
      setShowDocketSuggestions(false);
    }
  }, [form.watch('docketNumber'), handleSuggestionFetch]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">
          {entryToEdit ? 'Edit Timeline Entry' : 'Add New Timeline Entry'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal mt-1',
                      !form.watch('date') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('date') ? format(form.watch('date'), 'MM/dd/yyyy') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch('date')}
                    onSelect={(date) => form.setValue('date', date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.date && <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>}
            </div>

            <div>
              <Label htmlFor="user">User</Label>
              <Input id="user" value={MOCK_USER_NAME} readOnly className="mt-1 bg-muted/50" />
            </div>

            <div>
              <Label htmlFor="client">Client</Label>
              <Select onValueChange={(value) => form.setValue('client', value)} value={form.watch('client')}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.client && <p className="text-sm text-destructive mt-1">{form.formState.errors.client.message}</p>}
            </div>

            <div>
              <Label htmlFor="task">Task</Label>
              <Select onValueChange={(value) => form.setValue('task', value)} value={form.watch('task')}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.task && <p className="text-sm text-destructive mt-1">{form.formState.errors.task.message}</p>}
            </div>
          </div>
          
          <div className="relative">
            <Label htmlFor="docketNumber">Our Docket #</Label>
            <div className="relative mt-1">
              <Input
                id="docketNumber"
                {...form.register('docketNumber')}
                placeholder="Enter docket number"
                onFocus={() => docketSuggestions.length > 0 && setShowDocketSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDocketSuggestions(false), 100)} 
              />
              {isSuggestionLoading && form.watch('docketNumber') && (
                <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {showDocketSuggestions && docketSuggestions.length > 0 && (
              <Card className="absolute z-10 mt-1 w-full shadow-lg max-h-40 overflow-y-auto">
                <CardContent className="p-2">
                  {docketSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="p-2 hover:bg-muted rounded-md cursor-pointer text-sm"
                      onClick={() => {
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
            <Label htmlFor="description">Description</Label>
            <div className="relative mt-1">
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Describe the work done"
              rows={3}
              onFocus={() => descriptionSuggestions.length > 0 && setShowDescriptionSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDescriptionSuggestions(false), 100)}
            />
            {isSuggestionLoading && form.watch('description') && (
                <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-muted-foreground" />
            )}
            </div>
            {showDescriptionSuggestions && descriptionSuggestions.length > 0 && (
               <Card className="absolute z-10 mt-1 w-full shadow-lg max-h-48 overflow-y-auto">
                <CardContent className="p-2">
                  {descriptionSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="p-2 hover:bg-muted rounded-md cursor-pointer text-sm"
                      onClick={() => {
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
            <Label htmlFor="timeSpent">Time Spent (HH:MM)</Label>
            <Input
              id="timeSpent"
              type="text" 
              placeholder="e.g., 02:30 for 2h 30m"
              className="mt-1"
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
              <Button type="button" variant="outline" onClick={onCancelEdit} className="flex-grow-0">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

