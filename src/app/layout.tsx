import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/frontend_lib/components/auth-guard";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Attendance And Departure System",
  description:
    "Track employee check-in, check-out, and leave balance by department and role",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('theme');if(saved==='light'||saved==='dark'){document.documentElement.setAttribute('data-theme',saved);}else{document.documentElement.removeAttribute('data-theme');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
