
// src/components/TimelineCalendarView.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimelineEntry } from '@/lib/types';
import { isSameDay, isWeekend, isPast, startOfDay, isToday, getDaysInMonth, isAfter } from 'date-fns';

interface TimelineCalendarViewProps {
  entries: TimelineEntry[];
}

export function TimelineCalendarView({ entries }: TimelineCalendarViewProps) {
  const [highlightedDays, setHighlightedDays] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
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
      // Sort entries by date to find the earliest one
      const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sortedEntries[0] && sortedEntries[0].date) {
        earliestEntryDate = startOfDay(new Date(sortedEntries[0].date));
      }
    }

    // Only calculate missed days if there's at least one entry and thus an earliestEntryDate
    if (earliestEntryDate) {
      for (let day = 1; day <= numDaysInMonth; day++) {
        const currentDate = startOfDay(new Date(year, month, day));
        
        // A day is missed if:
        // 1. It's a weekday.
        // 2. It's strictly after the earliest entry date.
        // 3. It's in the past or is today (but not in the future).
        // 4. There is no timeline entry for that day.
        if (!isWeekend(currentDate) &&
            isAfter(currentDate, earliestEntryDate) && 
            (isPast(currentDate) || isToday(currentDate)) && // Ensures we only check up to today
            currentDate <= today && // Double ensure not future, (isPast || isToday) should cover this
            !daysWithEntries.some(entryDay => isSameDay(currentDate, entryDay))) {
          newMissedDays.push(currentDate);
        }
      }
    }
    // If earliestEntryDate is null (no entries), newMissedDays remains empty, so no past days marked red.
    setMissedDays(newMissedDays);

  }, [entries, currentMonth]);


  const modifiers = {
    entry: (date: Date) => highlightedDays.some(highlightedDate => isSameDay(date, highlightedDate)),
    weekend: (date: Date) => isWeekend(date),
    missed: (date: Date) => missedDays.some(missedDate => isSameDay(date, missedDate)),
  };

  const modifierStyles = {
    entry: {
      backgroundColor: 'hsl(var(--accent))',
      color: 'hsl(var(--accent-foreground))',
      borderRadius: '0.375rem',
    },
    weekend: {
      color: 'hsl(var(--muted-foreground))',
    },
    missed: {
      backgroundColor: 'hsl(var(--destructive))',
      color: 'hsl(var(--destructive-foreground))',
      borderRadius: '0.375rem',
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">Timeline Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="single"
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          modifiers={modifiers}
          modifiersStyles={modifierStyles}
          className="rounded-md border"
          captionLayout="dropdown-buttons"
          fromYear={new Date().getFullYear() - 5}
          toYear={new Date().getFullYear() + 5}
        />
      </CardContent>
    </Card>
  );
}

