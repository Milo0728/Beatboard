import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { ConfirmProvider } from "@/components/confirm-dialog";
import { SiteNav } from "@/components/site-nav";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BeatBoard — Música, calificada en vivo",
  description:
    "Plataforma de votación y crítica musical para canales de reacciones. Rankings dinámicos, reseñas y calificaciones en tiempo real.",
  openGraph: {
    title: "BeatBoard — Música, calificada en vivo",
    description:
      "Rankings dinámicos, reseñas y calificaciones para canales de reacciones musicales.",
    siteName: "BeatBoard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <ConfirmProvider>
            <SiteNav />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
