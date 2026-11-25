'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Silently re-fetches the dashboard's server data every 30 seconds so the
// assignment banner (and the rest of the dashboard) updates without a page
// reload. Renders nothing: router.refresh() keeps the scroll position and
// all client state. Pauses while the tab is hidden, and refreshes
// immediately when the tab becomes visible again.
export function DashboardAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') router.refresh();
    }
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 30000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [router]);

  return null;
}
