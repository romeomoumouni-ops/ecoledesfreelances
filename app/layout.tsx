import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: {
    default: "L'École des Freelances — Apprenez les métiers du freelancing",
    template: "%s — L'École des Freelances",
  },
  description:
    "La plateforme de formation en ligne qui vous forme aux métiers du freelancing : design, développement, marketing, rédaction et plus.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
