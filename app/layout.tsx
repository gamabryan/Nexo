import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Nexos",
  description:
    "Orçamentos, receita e estoque para prestadores de serviço. Monte propostas com IA e acompanhe o negócio no mesmo lugar.",
  icons: {
    icon: [{ url: "/nexos-mark.png", type: "image/png" }],
    apple: [{ url: "/nexos-mark.png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16362e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
