import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'KYUTOPIA Mission Control',
  description: 'KYUTOPIA AI Agent Orchestration Dashboard',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="bg-mc-bg text-mc-text min-h-screen">
        <Sidebar />
        <main className="md:ml-56 pb-20 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
