import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * One way back, on every officer screen that has somewhere to go back to.
 *
 * It prefers the browser's own history, because that is where the officer actually came from:
 * reaching a certificate from the dashboard and reaching it from the certificate list should
 * both return where they were. But history cannot be trusted blindly — a screen opened from a
 * pasted link or a bookmark has no in-app history, and `navigate(-1)` would walk out of the
 * portal or land on a dead entry. React Router records its position in `history.state.idx`, so
 * a zero (or absent) index means this entry is the first of the session and the parent route
 * is used instead.
 *
 * `to` is a fallback, not a destination: the parent list for a nested screen, the Dashboard
 * otherwise. That also keeps the control out of a loop, since the fallback is always further
 * up the hierarchy and never back the way we came.
 */
export function BackButton({ to = '/', label, className }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  const goBack = () => {
    if (canGoBack) navigate(-1);
    else navigate(to, { replace: true });
  };

  // A page that is its own parent has nothing to offer.
  if (!canGoBack && location.pathname === to) return null;

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        'mb-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-body font-medium text-primary transition-colors duration-150 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label || t('common.back')}
    </button>
  );
}
