import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/src/components/ui/sonner";
import { ThemeProvider } from "@/src/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PayrollSys — Sistem Manajemen Penggajian",
  description:
    "Sistem manajemen penggajian modern untuk mengelola karyawan, kehadiran, tunjangan, potongan, dan penggajian.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          {children}
          <Toaster
            richColors
            position="top-right"
            closeButton
            mobileOffset={{ top: 72 }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
