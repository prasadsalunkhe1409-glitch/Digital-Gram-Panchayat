import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { NotificationPrefs } from '@/features/settings/NotificationPrefs';

/** Standalone notification preferences page (reached from the notification centre). */
export function NotificationSettings() {
  const { t } = useTranslation();

  return (
    <div className="dgp-page">
      <PageHeader
        backTo="/settings"
        backLabel={t('settings.title')}
        title={t('notif.settings.title')}
        subtitle={t('notif.settings.subtitle')}
      />
      <Card>
        <CardContent>
          <NotificationPrefs />
        </CardContent>
      </Card>
    </div>
  );
}
