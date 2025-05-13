
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
import { loginUserServerAction } from '@/lib/actions'; // This will use the updated auth.ts
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';

const loginFormSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

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
      // Call the server action for Firebase login
      const result = await loginUserServerAction(data.email, data.password);

      if (result.success && result.user) {
        // Handle successful login (e.g., show a success message, redirect)
        toast({
          title: 'Login Successful!',
          description: `Welcome back, ${result.user.username}!`,
        });
        router.push('/'); // Redirect to the home page or dashboard
      } else {
        // Handle login failure (e.g., show an error message)
        setGlobalError(result.message || 'Login failed. Please try again.');
        toast({
          title: 'Login Failed.',
          description: result.message || 'An unknown error occurred.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setGlobalError('An error occurred during login. Please try again.');
      toast({
        title: 'An error occurred.',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 selection:bg-primary/20 selection:text-primary">
      <Card className="w-full max-w-md shadow-2xl bg-card rounded-xl">
        <CardHeader className="text-center space-y-2">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold gradient-text tracking-wide">
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
           <p className="text-xs text-muted-foreground mt-2">
             Hint: Use email <code className="bg-muted px-1 py-0.5 rounded-sm">user@example.com</code> and password <code className="bg-muted px-1 py-0.5 rounded-sm">password</code> for a pre-existing test user (if seeded).
           </p>
        </CardContent>
      </Card>
       <footer className="text-center p-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} TimeWise. All rights reserved.
      </footer>
    </div>
  );
}

