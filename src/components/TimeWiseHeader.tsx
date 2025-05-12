
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { logout as logoutClient } from '@/lib/auth'; // Client-side logout
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface TimeWiseHeaderProps {
  userName?: string | null;
}

export function TimeWiseHeader({ userName }: TimeWiseHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutClient();
    router.push('/login'); // Redirect to login after logout
  };

  return (
    <header className="shadow-md relative overflow-hidden bg-transparent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex h-24 items-center justify-between"> {/* Changed to justify-between */}
          <div className="flex items-center">
            <Image
              src="https://iili.io/38aoDx9.png"
              alt="TimeWise Logo"
              width={350} 
              height={80} 
              priority
              data-ai-hint="logo abstract"
            />
          </div>
          <div className="flex items-center space-x-4">
            {userName && (
              <span className="text-foreground font-medium hidden sm:block">
                Hello, {userName}
              </span>
            )}
            <Button variant="ghost" onClick={handleLogout} className="text-foreground hover:bg-muted">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
