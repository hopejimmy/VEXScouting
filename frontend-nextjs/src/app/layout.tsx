import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ReactQueryProvider } from '@/components/providers/react-query-provider';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { CompareProvider } from '@/contexts/CompareContext';

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VEX Scouting",
  description: "Professional VEX Robotics team scouting and analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50`}
      >
        <ReactQueryProvider>
          <FavoritesProvider>
            <CompareProvider>
              {children}
            </CompareProvider>
          </FavoritesProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
