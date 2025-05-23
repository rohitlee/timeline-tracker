'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';

import { signInWithEmailAndPassword } from 'firebase/auth'; // Firebase SDK
import { auth as firebaseAuth, db } from '@/lib/firebase';   // Your Firebase app instance
import Cookies from 'js-cookie';                            // For setting the custom cookie
import { doc, getDoc } from 'firebase/firestore';           // For fetching username

const loginFormSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface UserCookieData { // Keep this consistent with your types
  uid: string;
  email: string;
  username: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setGlobalError(null);
    form.clearErrors();

    try {
      // Call Firebase signInWithEmailAndPassword directly on the client
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        // Fetch username from Firestore to include in the cookie and for welcome message
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let username = data.email; // Default to email
        if (userDocSnap.exists()) {
          username = userDocSnap.data()?.username || data.email;
        }

        // Set your custom cookie for server actions/middleware if needed
        const userCookieData: UserCookieData = { uid: user.uid, email: user.email!, username };
        Cookies.set('user', JSON.stringify(userCookieData), { expires: 7, path: '/' });

        toast({
          title: 'Login Successful!',
          description: `Welcome back, ${username}!`,
        });
        console.log('[Login Page] Client-side login successful, redirecting to /');
        router.push('/');
      } else {
        // This case should ideally not be reached if signInWithEmailAndPassword throws an error for failures
        setGlobalError('Login failed. Please try again.');
        toast({
          title: 'Login Failed.',
          description: 'An unknown error occurred.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Firebase login error (client-side):', error.code, error.message);
      let friendlyMessage = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        friendlyMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many login attempts. Please try again later.';
      }
      setGlobalError(friendlyMessage);
      toast({
        title: 'Login Failed.',
        description: friendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url('/clouds.jpg')] bg-cover bg-center">
      <Card className="w-full max-w-md shadow-2xl bg-card rounded-xl">
        <CardHeader className="text-center space-y-2">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold text-accent tracking-wide">
            Secure Sign In
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Access your TimeWise dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {globalError && (
              <div role="alert" className="text-sm text-destructive-foreground bg-destructive p-3 rounded-md text-center">
                {globalError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className={form.formState.errors.email ? 'text-destructive' : 'text-foreground'}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                className={`bg-input border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:ring-primary ${form.formState.errors.email ? 'border-destructive focus:ring-destructive focus:border-destructive' : ''}`}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive pt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className={form.formState.errors.password ? 'text-destructive' : 'text-foreground'}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                className={`bg-input border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:ring-primary ${form.formState.errors.password ? 'border-destructive focus:ring-destructive focus:border-destructive' : ''}`}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive pt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-base py-3 rounded-lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardContent className="mt-0 pb-6 pt-0 text-center">
           <p className="text-sm text-muted-foreground">
             Don't have an account?{' '}
             <a href="/register" className="font-medium text-chart-2 hover:underline">
               Register
             </a>
           </p>
        </CardContent>
      </Card>
       <footer className="text-center p-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} TimeWise. All rights reserved.
      </footer>
    </div>
  );
}