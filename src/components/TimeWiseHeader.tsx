import { Clock3 } from 'lucide-react';

export function TimeWiseHeader() {
  return (
    <header className="bg-card shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Clock3 className="h-8 w-8 text-accent" />
            <h1 className="ml-3 text-3xl font-bold text-foreground">
              TimeWise
            </h1>
          </div>
          {/* Placeholder for potential future elements like user avatar or nav */}
        </div>
      </div>
    </header>
  );
}
