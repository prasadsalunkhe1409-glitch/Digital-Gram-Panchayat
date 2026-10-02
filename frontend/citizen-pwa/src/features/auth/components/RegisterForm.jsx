import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { VALIDATION, WARDS } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { FormField } from './FormField';

export function RegisterForm() {
  const { t } = useTranslation();
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      await registerUser(values);
      toast.success(t('auth.registerSuccess'));
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t('auth.registerFailed'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField
        label={t('auth.fullName')}
        error={errors.fullName}
        register={register('fullName', {
          required: t('auth.required'),
          minLength: { value: VALIDATION.FULLNAME_MIN_LENGTH, message: t('auth.nameShort') },
        })}
      />
      <FormField
        label={t('auth.mobile')}
        type="tel"
        inputMode="numeric"
        error={errors.mobile}
        register={register('mobile', {
          required: t('auth.required'),
          pattern: { value: VALIDATION.MOBILE_REGEX, message: VALIDATION.MOBILE_MESSAGE },
        })}
      />
      <FormField
        label={t('auth.password')}
        type="password"
        error={errors.password}
        register={register('password', {
          required: t('auth.required'),
          minLength: { value: VALIDATION.PASSWORD_MIN_LENGTH, message: t('auth.passwordShort') },
        })}
      />
      <FormField
        label={t('auth.village')}
        error={errors.village}
        register={register('village', { required: t('auth.required') })}
      />
      <FormField
        label={t('auth.address')}
        error={errors.address}
        register={register('address', { required: t('auth.required') })}
      />
      {/* A fixed list, not free text: the ward is what an officer filters by, and a typo
          quietly removes the citizen from the list their own officer searches. */}
      <FormField
        label={t('auth.ward')}
        placeholder={t('auth.wardPlaceholder')}
        error={errors.ward}
        options={WARDS}
        register={register('ward', { required: t('auth.wardRequired') })}
      />

      <Button type="submit" className="w-full" loading={isSubmitting}>
        {t('auth.register')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-primary">
          {t('auth.login')}
        </Link>
      </p>
    </form>
  );
}
