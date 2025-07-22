import { GlobalState } from '@/components/utility/global-state';
import { Providers } from '@/components/utility/providers';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { GlobalAlertDialog } from './global-alert-dialog';
import { createClient } from '@/lib/supabase/server';
import { UIState } from '@/components/utility/ui-state';
import { Toaster } from '@/components/ui/sonner';
import { PostHogProvider } from '@/app/providers';
import { MFAProvider } from '@/components/utility/mfa/use-mfa';
import { ConvexClientProvider } from './ConvexClientProvider';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Better font loading behavior
  variable: '--font-inter', // CSS variable for flexibility
});

const APP_NAME = 'PentestGPT';
const APP_DEFAULT_TITLE = 'PentestGPT - AI Assistant for Penetration Testers';
const APP_TITLE_TEMPLATE = '%s';
const APP_DESCRIPTION =
  'PentestGPT provides advanced AI and integrated tools to help security teams conduct comprehensive penetration tests effortlessly. Scan, exploit, and analyze web applications, networks, and cloud environments with ease and precision, without needing expert skills.';

interface RootLayoutProps {
  children: ReactNode;
}

export const metadata: Metadata = {
  applicationName: APP_NAME,
  metadataBase: new URL('https://pentestgpt.ai'),
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  keywords: [
    'pentestgpt',
    'pentest ai',
    'penetration testing ai',
    'pentesting ai',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: 'https://pentestgpt.ai/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'PentestGPT',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: 'https://pentestgpt.ai/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'PentestGPT',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const getUser = async () => {
    'use server';

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  const user = await getUser();

  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        {/* Modern Permissions Policy */}
        <meta
          httpEquiv="Permissions-Policy"
          content="cross-origin-isolated=(), autoplay=()"
        />
        
        {/* Preconnect to important origins */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        
        {/* Favicon and PWA assets */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} font-sans h-full bg-background text-foreground`}>
        <Providers attribute="class" defaultTheme="dark">
          <Toaster richColors position="top-center" duration={3000} />
          <div className="flex h-dvh flex-col items-center overflow-x-auto">
            {user ? (
              <GlobalState user={user}>
                <PostHogProvider>
                  <ConvexClientProvider>
                    <UIState>
                      <MFAProvider>{children}</MFAProvider>
                    </UIState>
                  </ConvexClientProvider>
                </PostHogProvider>
              </GlobalState>
            ) : (
              children
            )}
          </div>
          <GlobalAlertDialog />
        </Providers>
      </body>
    </html>
  );
}
