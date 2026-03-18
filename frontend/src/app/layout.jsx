import './globals.css';
import AppProviders from '@/app/_components/AppProviders';
import MainNav from '@/app/_components/MainNav';

export const metadata = {
  title: 'CLICON Marketplace',
  description: 'Figma-inspired eCommerce marketplace built with React and Tailwind'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppProviders>
          <MainNav />
          <main className="min-h-screen">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
