import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CS2 Skin Analytics',
  description: 'Аналитика покупки/продажи скинов CS2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-dark-950 text-dark-50">
        {children}
      </body>
    </html>
  );
}
