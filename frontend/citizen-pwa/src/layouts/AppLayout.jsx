import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { InstallPrompt } from '@/components/InstallPrompt';
import { BackgroundSync } from '@/components/BackgroundSync';
import { HelpAssistant } from '@/components/HelpAssistant';

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <OfflineBanner />

      {/* Bottom padding clears the fixed nav plus the device's home indicator. */}
      <main className="flex-1 pb-[calc(var(--citizen-bottom-nav-height)+1.625rem+env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
      <HelpAssistant />
      <InstallPrompt />
      <BackgroundSync />
    </div>
  );
}
