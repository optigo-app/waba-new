import { Poppins, Great_Vibes } from "next/font/google";
import "./globals.scss";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import ThemeRegistry from "./providers/ThemeRegistry";
import SocketProvider from "./providers/SocketProvider";
import { NotificationProvider } from "./components/NotificationProvider/NotificationProvider";
import NotificationToast from "./components/NotificationToast/NotificationToast";
import AuthHydrator from "./components/AuthHydrator";
import SessionGate from "./components/SessionGate";
import AppLayout from "./components/AppLayout";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "WABA",
    template: "%s | WABA",
  },
  description: "WhatsApp Business API Module",
};

// Runs before hydration to set data-theme from localStorage and avoid a flash.
const themeInitScript = `
(function() {
  try {
    var m = localStorage.getItem('waba-theme-mode');
    var resolved = 'light';
    if (m === 'dark') {
      resolved = 'dark';
    } else if (m === 'system') {
      resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${poppins.variable} ${greatVibes.variable}`}>
        <AuthHydrator>
          <SessionGate>
            <SocketProvider>
            <NotificationProvider>
              <AppRouterCacheProvider>
                <ThemeRegistry>
                  <AppLayout>{children}</AppLayout>
                  <NotificationToast />
                </ThemeRegistry>
              </AppRouterCacheProvider>
            </NotificationProvider>
          </SocketProvider>
          </SessionGate>
        </AuthHydrator>
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'var(--font-poppins), sans-serif',
              fontSize: '0.88rem',
              fontWeight: 500,
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            },
            success: {
              style: {
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #6ee7b7',
              },
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              style: {
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fca5a5',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
