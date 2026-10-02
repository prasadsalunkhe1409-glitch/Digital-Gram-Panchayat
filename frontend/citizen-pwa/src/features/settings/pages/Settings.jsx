import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages, Bell, HelpCircle, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/store';
import { NotificationPrefs } from '@/features/settings/NotificationPrefs';
import { replayOnboarding } from '@/features/onboarding/useOnboarding';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <h2 className="mb-3 flex items-center gap-2 text-section text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

const FAQ_KEYS = ['offline', 'complaint', 'language', 'install'];

/** One FAQ entry. aria-expanded/aria-controls make the disclosure legible to assistive tech. */
function FaqItem({ id, question, answer, isOpen, onToggle }) {
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;

  return (
    <div>
      <button
        type="button"
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-2 py-3 text-left text-body font-medium text-foreground"
      >
        {question}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      {isOpen ? (
        <p
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="pb-3 text-body text-muted-foreground"
        >
          {answer}
        </p>
      ) : null}
    </div>
  );
}

export function Settings() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);
  const faqId = useId();

  return (
    <div className="dgp-page space-y-4">
      <h1 className="text-title text-foreground">{t('settings.title')}</h1>

      <Section icon={Languages} title={t('settings.language')}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { code: 'mr', label: 'मराठी' },
            { code: 'en', label: 'English' },
          ].map((l) => (
            <Button
              key={l.code}
              variant={language === l.code ? 'default' : 'outline'}
              aria-pressed={language === l.code}
              onClick={() => setLanguage(l.code)}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </Section>

      <Section icon={Bell} title={t('settings.notifications')}>
        <NotificationPrefs />
      </Section>

      <Section icon={HelpCircle} title={t('settings.help')}>
        <p className="mb-2 text-body text-muted-foreground">{t('settings.helpBody')}</p>
        <Link
          to="/help"
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-body font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          {t('help.openCenter')}
        </Link>
        <div className="divide-y divide-border border-t border-border">
          {FAQ_KEYS.map((key) => (
            <FaqItem
              key={key}
              id={`${faqId}-${key}`}
              question={t(`settings.faq.${key}.q`)}
              answer={t(`settings.faq.${key}.a`)}
              isOpen={openFaq === key}
              onToggle={() => setOpenFaq(openFaq === key ? null : key)}
            />
          ))}
        </div>
      </Section>

      <Section icon={RotateCcw} title={t('settings.onboarding')}>
        <p className="mb-3 text-body text-muted-foreground">{t('settings.onboardingBody')}</p>
        <Button variant="outline" onClick={replayOnboarding}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('settings.replay')}
        </Button>
      </Section>
    </div>
  );
}
