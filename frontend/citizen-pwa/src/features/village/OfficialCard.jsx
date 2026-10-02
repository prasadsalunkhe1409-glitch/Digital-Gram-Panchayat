import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Phone, Mail, Copy, MapPin, Clock, Building2, CalendarRange } from 'lucide-react';
import { formatDate } from '@dgp/shared';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { SafeImage } from '@/components/SafeImage';
import { tenureInfo } from './members';

const STATUS_COLOR = { Active: 'green', Retired: 'grey', Temporary: 'orange' };

/** Initials fallback when a member has no photo. */
function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  );
}

async function copy(value, label, t) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(t('directory.copied', { label }));
  } catch {
    toast.error(t('directory.copyFailed'));
  }
}

function Avatar({ member, size }) {
  const cls = size === 'lg' ? 'h-16 w-16 text-title' : 'h-12 w-12 text-body';
  return member.photo ? (
    <SafeImage
      src={member.photo}
      alt=""
      loading="lazy"
      className={`${cls} shrink-0 rounded-full border border-border object-cover`}
    />
  ) : (
    <span
      className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary-subtle font-semibold text-primary`}
      aria-hidden="true"
    >
      {initials(member.name)}
    </span>
  );
}

function ContactButton({ href, icon: Icon, label, variant = 'primary' }) {
  const cls =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
      : 'border border-border text-foreground hover:bg-accent';
  return (
    // min-h-11 (44px): calling an official is the primary action on this card and is used on a
    // phone. It was 36px.
    <a
      href={href}
      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-caption font-medium transition-colors duration-150 ${cls}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}

/**
 * A government-style official card. `variant="compact"` (dashboard) shows identity + call/email;
 * `variant="full"` (directory) adds every contact, office details, responsibilities and tenure.
 * Reads a single Village Profile `member` — no duplicated data.
 */
export function OfficialCard({ member, variant = 'full' }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const compact = variant === 'compact';
  const { yearsServed, remainingYears } = tenureInfo(member);
  const mapsHref = member.officeAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.officeAddress)}`
    : null;

  return (
    <Card className="flex h-full min-w-0 flex-col gap-3 p-4 transition-shadow duration-150 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar member={member} size={compact ? 'sm' : 'lg'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-body font-semibold text-foreground">{member.name || '—'}</p>
            {member.status ? (
              <Chip color={STATUS_COLOR[member.status] || 'grey'} className="shrink-0">
                {t(`directory.status.${member.status}`, member.status)}
              </Chip>
            ) : null}
          </div>
          {member.designation ? (
            <p className="truncate text-caption text-muted-foreground">{member.designation}</p>
          ) : null}
          {member.ward ? (
            <p className="mt-0.5 text-caption text-muted-foreground">
              {t('directory.ward')}: {member.ward}
            </p>
          ) : null}
          {/*
           * The number itself, on the compact card too.
           *
           * The compact card carried a "Call" button and nothing else, so a citizen on the
           * home page could dial the member but could not read, write down or dictate the
           * number — and on a desktop, where tel: does nothing useful, the button was the
           * only thing there. The digits are now on the card in both variants.
           */}
          {compact && member.mobile ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-caption text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
              <a
                href={`tel:${member.mobile}`}
                aria-label={`${t('directory.call')} ${member.name || ''} ${member.mobile}`}
                className="tabular-nums text-foreground hover:text-primary"
              >
                {member.mobile}
              </a>
            </p>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="space-y-1.5 text-caption text-muted-foreground">
          {member.mobile ? (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <a href={`tel:${member.mobile}`} className="text-foreground hover:text-primary">
                {member.mobile}
              </a>
              <button
                type="button"
                onClick={() => copy(member.mobile, t('directory.field.mobile'), t)}
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded hover:bg-accent"
                aria-label={t('directory.copyPhone')}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {member.officePhone ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <a href={`tel:${member.officePhone}`} className="text-foreground hover:text-primary">
                {member.officePhone}
              </a>
            </div>
          ) : null}
          {member.email ? (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <a
                href={`mailto:${member.email}`}
                className="truncate text-foreground hover:text-primary"
              >
                {member.email}
              </a>
              <button
                type="button"
                onClick={() => copy(member.email, t('directory.field.email'), t)}
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded hover:bg-accent"
                aria-label={t('directory.copyEmail')}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {member.officeHours ? (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{member.officeHours}</span>
            </div>
          ) : null}
          {member.officeAddress ? (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                {member.officeAddress}
                {mapsHref ? (
                  <>
                    {' · '}
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-primary hover:text-primary-hover"
                    >
                      {t('directory.viewLocation')}
                    </a>
                  </>
                ) : null}
              </span>
            </div>
          ) : null}
          {member.termStart || member.termEnd ? (
            <div className="flex items-start gap-2">
              <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {member.termStart ? formatDate(member.termStart, locale) : '—'}
                {' – '}
                {member.termEnd ? formatDate(member.termEnd, locale) : '—'}
                {yearsServed != null
                  ? ` · ${t('directory.yearsServed', { count: yearsServed })}`
                  : ''}
                {remainingYears != null
                  ? ` · ${t('directory.remaining', { count: remainingYears })}`
                  : ''}
              </span>
            </div>
          ) : null}
          {member.responsibilities ? (
            <p className="pt-1 text-foreground">{member.responsibilities}</p>
          ) : null}
        </div>
      ) : null}

      {member.mobile || member.email ? (
        <div className="mt-auto flex gap-2 pt-1">
          {member.mobile ? (
            <ContactButton href={`tel:${member.mobile}`} icon={Phone} label={t('directory.call')} />
          ) : null}
          {member.email ? (
            <ContactButton
              href={`mailto:${member.email}`}
              icon={Mail}
              label={t('directory.email')}
              variant="outline"
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
