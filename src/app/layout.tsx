
import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// GeistSans and GeistMono are imported as font objects.
// Their 'variable' property contains the CSS class name that defines the font's CSS custom property.
// We use these directly in the className of the html or body tag.

const roboto = Roboto({
  weight: ['400', '700'],
  subsets: ['latin'],
});

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
      <body className={`${roboto.className} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
