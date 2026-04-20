import Providers from './providers';
import './globals.css';
import { getConfig } from '@/lib/config';

export async function generateMetadata() {
  const config = getConfig();
  return {
    title: config.title,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
