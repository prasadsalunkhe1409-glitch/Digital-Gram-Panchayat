import { useTranslation } from 'react-i18next';
import { WARDS, WARD_ALL, WARD_UNSET } from '@dgp/shared';
import { Select } from '@/components/ui/input';

/**
 * The ward control, shared by every officer screen that has one.
 *
 * Four screens needed this at once — users, tax, certificates, timetable — and four
 * hand-rolled selects is four chances for one of them to send a value the API rejects, or to
 * quietly omit the "no ward recorded" option that officers need to clean up old accounts.
 *
 * `variant` is the only difference between them, because the question each screen asks is
 * genuinely different:
 *
 *   'people'   — users, tax, certificates. A citizen lives in one of six wards, or in none
 *                yet. 'All Wards' is not somewhere anyone lives, so it is not offered.
 *   'schedule' — the timetable. An entry can apply village-wide, so 'All Wards' is a real
 *                value to filter for.
 *   'assign'   — the person editor, not a filter. Only the six real wards.
 *   'scheduleAssign' — the timetable editor: the six wards plus village-wide.
 *
 * Neither editing variant offers 'unset'. It is a filter token for finding the records that
 * predate the ward field, never a value anything can be set to — offering it would let an
 * officer blank a ward that the backend would then reject.
 */
const OPTIONS = {
  people: () => [...WARDS, WARD_UNSET],
  schedule: () => [WARD_ALL, ...WARDS, WARD_UNSET],
  assign: () => WARDS,
  scheduleAssign: () => [WARD_ALL, ...WARDS],
};

export function WardFilter({
  value,
  onChange,
  variant = 'people',
  includeAll = true,
  id,
  className = 'w-auto',
  disabled,
}) {
  const { t } = useTranslation();
  const options = (OPTIONS[variant] ?? OPTIONS.people)();

  // The stored value stays 'Ward 3'; only its label is translated. Returning the raw value
  // left the Marathi interface reading the six wards in English.
  const labelFor = (v) => {
    if (v === WARD_UNSET) return t('ward.unset');
    if (v === WARD_ALL) return t('ward.allWards');
    return t(`ward.names.${v}`, v);
  };

  return (
    <Select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t('ward.filter')}
      className={className}
    >
      {/* The empty value means "do not filter", which is not the same as the 'All Wards'
          timetable value — one asks for everything, the other for village-wide entries. */}
      {includeAll ? <option value="">{t('ward.all')}</option> : null}
      {options.map((w) => (
        <option key={w} value={w}>
          {labelFor(w)}
        </option>
      ))}
    </Select>
  );
}

/** The label a row shows for a ward that may not be set. Never blank, never guessed. */
export function wardLabel(ward, t) {
  if (!ward) return t('ward.unset');
  if (ward === WARD_ALL) return t('ward.allWards');
  return t(`ward.names.${ward}`, ward);
}
