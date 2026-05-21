import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ATHLETIQ',
  description: 'Verified athlete identity and school sports infrastructure.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
