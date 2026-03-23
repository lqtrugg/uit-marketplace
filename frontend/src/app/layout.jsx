import './globals.css';
import RouteAwareNav from '@/app/_components/RouteAwareNav';

export const metadata = {
  title: 'Market Pulse UIT',
  description: 'Modern eCommerce marketplace frontend for UIT built with React and Tailwind'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <RouteAwareNav />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
