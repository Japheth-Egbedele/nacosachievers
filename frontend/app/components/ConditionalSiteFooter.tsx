'use client';

import { usePathname } from 'next/navigation';
import SiteFooter from './SiteFooter';

export default function ConditionalSiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith('/hub')) return null;
  return <SiteFooter />;
}
