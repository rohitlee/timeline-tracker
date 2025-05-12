
// src/components/TimelineCalendarView.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimelineEntry } from '@/lib/types';
import { isSameDay, isWeekend, isPast, startOfDay, isToday, getDaysInMonth } from 'date-fns';

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
    const numDaysInMonth = getDaysInMonth(currentMonth); // Use getDaysInMonth for accuracy
    const newMissedDays: Date[] = [];

    for (let day = 1; day <= numDaysInMonth; day++) {
      const currentDate = startOfDay(new Date(year, month, day));
      
      // A day is missed if:
      // 1. It's a weekday (not Saturday or Sunday).
      // 2. It's in the past or is today.
      // 3. There is no timeline entry for that day.
      if (!isWeekend(currentDate) && 
          (isPast(currentDate) || isToday(currentDate)) && 
          !daysWithEntries.some(entryDay => isSameDay(currentDate, entryDay))) {
        newMissedDays.push(currentDate);
      }
    }
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

