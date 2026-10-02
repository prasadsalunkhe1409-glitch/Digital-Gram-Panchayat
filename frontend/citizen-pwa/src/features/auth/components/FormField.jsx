import { useId } from 'react';
import { cn } from '@/utils/cn';
import { controlClass } from '@/components/ui/input';

/**
 * Labeled input with inline error, wired for React Hook Form's register().
 *
 * Styling comes from the shared control class rather than a local copy, so auth inputs
 * stay in step with every other field in the app. The error is linked by id and given
 * role="alert" — a red border alone doesn't reach a screen reader.
 *
 * Pass `options` to render a <select> instead of an <input>. One component rather than a
 * near-identical FormSelect, so the label, error wiring and aria plumbing cannot drift apart.
 */
export function FormField({
  label,
  error,
  register,
  type = 'text',
  hint,
  className,
  options,
  placeholder,
  ...props
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-label text-foreground">
        {label}
      </label>
      {options ? (
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error && errorId, hint && hintId) || undefined}
          defaultValue=""
          className={cn(
            controlClass,
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          {...register}
          {...props}
        >
          {/* An empty first option, so the form cannot be submitted on a default nobody chose. */}
          <option value="" disabled>
            {placeholder ?? '—'}
          </option>
          {options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>
              {o.label ?? o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error && errorId, hint && hintId) || undefined}
          className={cn(
            controlClass,
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          {...register}
          {...props}
        />
      )}
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-destructive-strong">
          {error.message}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
