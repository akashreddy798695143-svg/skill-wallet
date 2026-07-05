import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voice-Based Connect — AI Speech Intelligence Platform",
  description:
    "Record, transcribe, analyze, and improve your spoken communication with AI-powered speech-to-text, emotion detection, speaker verification, and instant evaluation feedback.",
  keywords: [
    "Voice-Based Connect",
    "Speech to Text",
    "Whisper",
    "Speaker Verification",
    "Emotion Detection",
    "AI Speech Evaluation",
    "Text to Speech",
  ],
  authors: [{ name: "Voice-Based Connect" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Voice-Based Connect — AI Speech Intelligence Platform",
    description:
      "AI-powered speech recording, transcription, emotion detection, speaker verification, and evaluation feedback.",
    type: "website",
  },
};

// Prevent theme flash: apply stored theme before hydration.
const themeScript = `(function(){try{var t=localStorage.getItem('vbc-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <SonnerToaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "glass-strong border",
            },
          }}
        />
      </body>
    </html>
  );
}
