import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { VALIDATION, ROLES } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/authService';
import { FormField } from './FormField';

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174';

/**
 * The one login form for the whole system. `mode` ('villager' | 'officer') changes ONLY
 * the copy and accents — the same fields hit the same endpoint either way, and the backend's
 * returned role decides where the browser goes (citizens stay in this PWA, officers are
 * handed to the admin portal with the token in the URL fragment, never sent to any server).
 *
 * The form stays mounted across tab switches so entered values survive; only the
 * mode-specific text blocks remount (keyed) to get the 200ms fade.
 */
export function LoginForm({ mode = 'villager' }) {
  const { t } = useTranslation();
  const { adoptSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const officer = mode === 'officer';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const { user, token } = await authService.loginSession(values);
      const isOfficerAccount = user.role === ROLES.OFFICER;

      // The tab must match the account's role. On a mismatch the issued token is simply
      // discarded — nothing is stored, no session starts, the user is told which door
      // to use. (Same endpoint either way; this is a UI gate, not an auth change.)
      if (isOfficerAccount && !officer) {
        toast.error(t('auth.wrongTabOfficer'));
        return;
      }
      if (!isOfficerAccount && officer) {
        toast.error(t('auth.wrongTabVillager'));
        return;
      }

      if (isOfficerAccount) {
        // Officer: this app never stores the session — hand it to the admin portal.
        window.location.replace(`${ADMIN_URL}/auth/callback#token=${encodeURIComponent(token)}`);
        return;
      }

      adoptSession(user, token);
      toast.success(t('auth.loginSuccess'));
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t('auth.loginFailed'));
    }
  };

  // No self-service reset exists — password resets go through the panchayat office.
  const forgotPassword = () => toast(t('auth.forgotHint'));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Mode heading — keyed so it remounts and fades on tab switch. */}
      <div key={mode} className="animate-in fade-in duration-200">
        <h2 className="text-section text-foreground">
          {officer ? t('auth.officerLoginTitle') : t('auth.citizenLoginTitle')}
        </h2>
        <p className="mt-1 text-caption text-muted-foreground">
          {officer ? t('auth.officerLoginDesc') : t('auth.citizenLoginDesc')}
        </p>
      </div>

      <FormField
        label={officer ? t('auth.officerEmail') : t('auth.identifier')}
        type="text"
        autoComplete="username"
        inputMode={officer ? 'email' : 'text'}
        error={errors.identifier}
        register={register('identifier', {
          required: t('auth.required'),
          validate: (value) =>
            VALIDATION.MOBILE_REGEX.test(value.trim()) ||
            VALIDATION.EMAIL_REGEX.test(value.trim()) ||
            t('auth.identifierInvalid'),
        })}
      />
      <FormField
        label={t('auth.password')}
        type="password"
        autoComplete="current-password"
        error={errors.password}
        register={register('password', { required: t('auth.required') })}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={forgotPassword}
          className="rounded-md px-1 py-0.5 text-caption font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
        >
          {t('auth.forgot')}
        </button>
      </div>

      {/*
        Villager carries the palette's interactive blue, officer the brand navy — the same two
        values the button system already defines, rather than a colour mixed in at the call
        site. `bg-info` was doing this job before and sat outside the palette entirely.
      */}
      <Button
        type="submit"
        variant={officer ? 'default' : 'secondary'}
        className="w-full"
        loading={isSubmitting}
      >
        {t('auth.login')}
      </Button>

      {officer ? (
        <p
          key="officer-warning"
          className="flex animate-in items-start gap-2 rounded-md bg-warning-subtle p-3 text-caption text-warning-strong ring-1 ring-inset ring-warning/30 duration-200 fade-in"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('auth.officerWarning')}
        </p>
      ) : (
        <p
          key="register-link"
          className="animate-in text-center text-body text-muted-foreground duration-200 fade-in"
        >
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-primary">
            {t('auth.register')}
          </Link>
        </p>
      )}
    </form>
  );
}
