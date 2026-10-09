import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Praesidium — Autonomous PayPal Dispute Defense',
  description: 'AI-powered merchant dispute defense system integrating PayPal Disputes APIs and NVIDIA NIM.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen relative bg-background text-foreground antialiased selection:bg-amber-500/20 selection:text-amber-300">
        {/* Ambient atmospheric glows */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px]" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 bg-amber-600/4 rounded-full blur-[160px]" />
          <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] bg-indigo-500/3 rounded-full blur-[180px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
