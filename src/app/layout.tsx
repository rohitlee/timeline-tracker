
import type { Metadata } from 'next';
// Import GeistSans and GeistMono directly from their specific paths
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// GeistSans and GeistMono are imported as font objects.
// Their 'variable' property contains the CSS class name that defines the font's CSS custom property.
// We use these directly in the className of the html or body tag.

export const metadata: Metadata = {
  title: 'TimeWise',
  description: 'Intelligent Timeline Management by Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        Apply the font variables to the body tag by adding the class names
        provided by GeistSans.variable and GeistMono.variable.
        This makes the CSS variables (--font-geist-sans, --font-geist-mono)
        available for use in globals.css and Tailwind configuration.
      */}
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
