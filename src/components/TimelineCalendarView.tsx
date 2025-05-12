
// src/components/TimelineCalendarView.tsx
'use client';

import { useState, useEffect } from 'react';
import { getTimelineEntriesAction } from '@/lib/actions'; // Import the server action
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TimelineEntry } from '@/lib/types';
import { isSameDay, isWeekend, isPast, startOfDay, isToday, getDaysInMonth, isAfter, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimelineCalendarViewProps {
  entries: TimelineEntry[]; // Receive entries as a prop
  onMonthChange: (month: Date) => void; // Prop to handle month change
  currentMonth: Date; // Prop for the current month
}


export function TimelineCalendarView({ entries, onMonthChange, currentMonth }: TimelineCalendarViewProps) {
  const [highlightedDays, setHighlightedDays] = useState<Date[]>([]);
  const [missedDays, setMissedDays] = useState<Date[]>([]);

  useEffect(() => {
    const daysWithEntries = entries.map(entry => startOfDay(new Date(entry.date)));
    setHighlightedDays(daysWithEntries);

    const today = startOfDay(new Date());
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const numDaysInMonth = getDaysInMonth(currentMonth);
    const newMissedDays: Date[] = [];

    let earliestEntryDate: Date | null = null;
    if (entries.length > 0) {
      const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sortedEntries[0] && sortedEntries[0].date) {
        earliestEntryDate = startOfDay(new Date(sortedEntries[0].date));
      }
    }

    if (earliestEntryDate) {
      for (let day = 1; day <= numDaysInMonth; day++) {
        const currentDate = startOfDay(new Date(year, month, day));
        
        if (!isWeekend(currentDate) &&
            earliestEntryDate && isAfter(currentDate, earliestEntryDate) && 
            isPast(currentDate) && !isToday(currentDate) && 
            !daysWithEntries.some(entryDay => isSameDay(currentDate, entryDay))) {
          newMissedDays.push(currentDate);
        }
      }
    }
    setMissedDays(newMissedDays);

  }, [entries, currentMonth]);


  const modifiers = {
    entry: (date: Date) => highlightedDays.some(highlightedDate => isSameDay(date, highlightedDate)),
    weekend: (date: Date) => isWeekend(date),
    missed: (date: Date) => missedDays.some(missedDate => isSameDay(date, missedDate)),
    today: (date: Date) => isToday(date),
  };

  const modifierStyles = {
    entry: {
      backgroundColor: 'hsl(var(--accent))',
      color: 'hsl(var(--accent-foreground))',
      borderRadius: '9999px', // Make it round
      border: 'none',
    },
    weekend: {
      color: 'hsl(var(--muted-foreground))',
    },
    missed: {
      backgroundColor: '#FDE1E1', // Button color #FDE1E1
      color: '#FD0101', // Font color #FD0101
      borderRadius: '9999px', // Make it round
      border: 'none',
    },
    day: { // Default day style
      borderRadius: '9999px', // Make it round
      color: '#9301FD', // Font color #9301FD
      backgroundColor: '#F1E1FD', // Button color #F1E1FD
      border: 'none',
    },
    today: {
      fontWeight: 'bold',
      border: '2px solid hsl(var(--primary))',
      borderRadius: '9999px',
    }
  };

  return (
    <Card className="shadow-lg w-full"> {/* Added w-full */}
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground gradient-text">Timeline Overview</CardTitle>
        <CardDescription className="text-muted-foreground">Calendar view of your timeline entries. Days with entries are highlighted. Missed workdays are flagged.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center p-0 sm:p-2 md:p-4"> {/* Centered calendar and adjusted padding */}
        <Calendar
          mode="single"
          month={currentMonth}
          onMonthChange={onMonthChange}
          modifiers={modifiers}
          modifiersStyles={modifierStyles}
          className="rounded-md border-0 p-0 sm:p-2 md:p-4 max-w-full sm:max-w-md md:max-w-lg" // Adjusted padding, removed border, set max-width for responsiveness
          classNames={{
            caption_label: "text-lg font-medium gradient-text", // Larger text for month/year
            nav_button: "h-8 w-8 rounded-full bg-transparent hover:bg-muted border-0", // Round nav buttons, no border
            day: cn(
              "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-full", // Default day button styling
              "hover:bg-muted focus:bg-muted"
            ),
            
          }}
          captionLayout="dropdown-buttons" 
          fromYear={new Date().getFullYear() - 5}
          toYear={new Date().getFullYear() + 5}
          formatters={{
            formatCaption: (date) => `${format(date, 'MMMM yyyy')}`,
          }}
        
        />
      </CardContent>
    </Card>
  );
}
