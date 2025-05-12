// src/components/TimelineCalendarView.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimelineEntry } from '@/lib/types';
import { isSameDay } from 'date-fns';

interface TimelineCalendarViewProps {
  entries: TimelineEntry[];
}

export function TimelineCalendarView({ entries }: TimelineCalendarViewProps) {
  const [highlightedDays, setHighlightedDays] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    const daysWithEntries = entries.map(entry => new Date(entry.date));
    setHighlightedDays(daysWithEntries);
  }, [entries]);

  const modifiers = {
    entry: (date: Date) => highlightedDays.some(highlightedDate => isSameDay(date, highlightedDate)),
    weekend: { daysOfWeek: [0, 6] } // 0 = Sunday, 6 = Saturday
  };

  const modifierStyles = {
    entry: {
      backgroundColor: 'hsl(var(--accent))',
      color: 'hsl(var(--accent-foreground))',
      borderRadius: '0.375rem', // rounded-md
    },
    weekend: {
      color: 'hsl(var(--muted-foreground))', // Mute the text color for weekends
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
