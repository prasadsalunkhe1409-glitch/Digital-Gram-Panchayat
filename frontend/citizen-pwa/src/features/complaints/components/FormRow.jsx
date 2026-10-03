import { useTranslation } from 'react-i18next';

export function FormRow({ label, error, optional, children }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      {/*
       * The label wraps the control so the association is implicit. It previously sat as a
       * sibling with no `for` and no nesting, so `input.labels` was empty — every field on the
       * New Complaint form was announced by a screen reader with no name (WCAG 1.3.1 / 4.1.2).
       */}
      <label className="block space-y-1">
        <span className="block text-label text-foreground">
          {label}
          {optional ? (
            <span className="ml-1 text-caption font-normal text-muted-foreground">
              ({t('complaint.form.optional')})
            </span>
          ) : null}
        </span>
        {children}
      </label>
      {error ? <p className="text-caption text-destructive-strong">{error.message}</p> : null}
    </div>
  );
}
