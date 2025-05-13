
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
// import { register } from '@/lib/auth'; // To be updated to use Firebase
import { registerUserServerAction } from '@/lib/actions'; // Server action for Firebase registration
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

const registerFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  // In src/app/register/page.tsx
  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      // Call the server action for Firebase registration
      const result = await registerUserServerAction(data.email, data.password, data.username);
      
      if (result.success) {
        // Handle successful registration (e.g., show a success message, redirect)
        toast({
          title: 'Registration Successful!',
          description: 'You have successfully registered.',
        });
        router.push('/login'); // Redirect to the login page
        } else {
          // Handle registration failure (e.g., show an error message)
          toast({
            title: 'Registration Failed.',
            description: result.message || 'An unknown error occurred.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Registration error:', error);
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
          <UserPlus className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold gradient-text tracking-wide">
            Create Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Join TimeWise today.
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
              <Label htmlFor="username" className={form.formState.errors.username ? 'text-destructive' : 'text-foreground'}>
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                disabled={isLoading}
                className={`bg-input border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:ring-primary ${form.formState.errors.username ? 'border-destructive focus:ring-destructive focus:border-destructive' : ''}`}
                {...form.register('username')}
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive pt-1">{form.formState.errors.username.message}</p>
              )}
            </div>
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
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={isLoading}
                className={`bg-input border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:ring-primary ${form.formState.errors.password ? 'border-destructive focus:ring-destructive focus:border-destructive' : ''}`}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive pt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-base py-3 rounded-lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Register'}
            </Button>
          </form>
        </CardContent>
        <CardContent className="mt-0 pb-6 pt-0 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-chart-2 hover:underline">
              Sign In
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
