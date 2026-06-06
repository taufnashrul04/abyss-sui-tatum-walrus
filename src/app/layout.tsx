import type { Metadata } from "next";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Abyss Protocol — Decentralized Digital Legacy Platform",
  description:
    "Secure your digital legacy with military-grade encryption on Walrus decentralized storage. Dead Man's Switch powered by Sui blockchain and Tatum API.",
  keywords: [
    "digital legacy",
    "dead man's switch",
    "walrus",
    "sui",
    "blockchain",
    "encryption",
    "decentralized storage",
  ],
  authors: [{ name: "Skypots" }],
  openGraph: {
    title: "Abyss Protocol — Your Digital Legacy, Secured Forever",
    description:
      "Encrypted dead man's switch on Walrus + Sui. Protect your digital assets for your loved ones.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-full w-full flex flex-col overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
