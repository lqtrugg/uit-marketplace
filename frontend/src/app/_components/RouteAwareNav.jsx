'use client';

import { usePathname } from 'next/navigation';
import MainNav from '@/app/_components/MainNav';

export default function RouteAwareNav() {
  const pathname = usePathname();

  if (pathname === '/') {
    return null;
  }

  return <MainNav />;
}
