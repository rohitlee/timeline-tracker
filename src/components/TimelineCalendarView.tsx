// src/components/TimelineCalendarView.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TimelineEntry } from '@/lib/types';
import { isSameDay, isWeekend, isPast, startOfDay, isToday, getDaysInMonth, isAfter, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

interface TimelineCalendarViewProps {
  entries: TimelineEntry[];
  onMonthChange: (month: Date) => void;
  currentMonth: Date;
}

const EmptyCaptionLabel = () => null;

export function TimelineCalendarView({ entries, onMonthChange, currentMonth }: TimelineCalendarViewProps) {
  const [highlightedEntryDays, setHighlightedEntryDays] = useState<Date[]>([]);
  const [missedDays, setMissedDays] = useState<Date[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);


  useEffect(() => {
    const daysWithEntries = entries.map(entry => startOfDay(new Date(entry.date)));
    setHighlightedEntryDays(daysWithEntries);

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
        const currentDateInLoop = startOfDay(new Date(year, month, day));
        
        if (!isWeekend(currentDateInLoop) &&
            earliestEntryDate && isAfter(currentDateInLoop, earliestEntryDate) && 
            isPast(currentDateInLoop) && !isToday(currentDateInLoop) && 
            !daysWithEntries.some(entryDay => isSameDay(currentDateInLoop, entryDay))) {
          newMissedDays.push(currentDateInLoop);
        }
      }
    }
    setMissedDays(newMissedDays);

  }, [entries, currentMonth]);

  const modifiers = {
    entry: (date: Date) => highlightedEntryDays.some(highlightedDate => isSameDay(date, highlightedDate)),
    missed: (date: Date) => missedDays.some(missedDate => isSameDay(date, missedDate)),
  };

  const modifierStyles = {
    entry: { 
      backgroundColor: 'hsl(var(--accent))', 
      color: 'hsl(var(--accent-foreground))', 
      borderRadius: '9999px', 
    },
    missed: { 
      backgroundColor: 'hsl(var(--destructive))', 
      color: 'hsl(var(--destructive-foreground))',
      borderRadius: '9999px',
    },
    weekend: {
      color: 'hsl(var(--muted-foreground))',
    },
  };

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-accent">Timeline Overview</CardTitle>
        <CardDescription className="text-muted-foreground">
          Calendar view of your timeline entries. Click a day to select it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center p-0 sm:p-2 md:p-4">
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          month={currentMonth}
          onMonthChange={onMonthChange}
          modifiers={modifiers}
          modifiersStyles={modifierStyles}
          className="rounded-md border-0 p-0 sm:p-2 md:p-4 max-w-full sm:max-w-md md:max-w-lg"
          classNames={{
            caption: "flex justify-center items-center pt-1 mb-3 relative px-8", // Increased horizontal padding
            caption_label: "text-lg font-semibold text-accent mx-1", // Added small horizontal margin to dropdown labels themselves
            
            nav: "flex items-center", // No change, as buttons are absolute
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "h-8 w-8 bg-transparent p-0 hover:bg-muted"
            ),
            // Nav buttons are positioned relative to the caption div, which now has px-8 padding
            nav_button_previous: "absolute left-1 top-1/2 -translate-y-1/2", // Sits 0.25rem into the 2rem left padding
            nav_button_next: "absolute right-1 top-1/2 -translate-y-1/2",    // Sits 0.25rem into the 2rem right padding
            
            head_row: "flex w-full mt-3 gap-x-1",
            head_cell: "text-muted-foreground rounded-md w-9 font-medium text-xs uppercase",

            table: "w-full border-collapse mt-1",
            row: "flex w-full mt-1.5 gap-x-1",
            cell: cn(
              "p-0 text-center text-sm relative flex-1",
              "[&:has([aria-selected])]:bg-transparent",
              "focus-within:relative focus-within:z-20"
            ),
            day: cn(
              "h-9 w-9 p-0 font-normal rounded-md flex items-center justify-center mx-auto",
              "hover:bg-muted focus:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            ),
            day_today: cn(
              "!border-2 !border-primary !text-primary rounded-md" 
            ),
            day_selected: cn(
              "!bg-primary !text-primary-foreground rounded-full",
              "focus:!bg-primary focus:!text-primary-foreground"
            ),
            day_outside: "text-muted-foreground/30 opacity-50",
            day_disabled: "text-muted-foreground/30 opacity-50",
          }}
          captionLayout="dropdown-buttons" 
          fromYear={new Date().getFullYear() - 5}
          toYear={new Date().getFullYear() + 5}
          formatters={{
            formatCaption: (date) => `${format(date, 'MMMM yyyy')}`, 
          }}
          components={{
            CaptionLabel: EmptyCaptionLabel, 
            IconLeft: ({ ...props }) => <ChevronLeft className="h-5 w-5" {...props} />,
            IconRight: ({ ...props }) => <ChevronRight className="h-5 w-5" {...props} />,
          }}
        />
      </CardContent>
    </Card>
  );
}