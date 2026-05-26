import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "reactflow/dist/style.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Cortex Memory OS",
  description: "A persistent cognitive layer with temporal awareness."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
