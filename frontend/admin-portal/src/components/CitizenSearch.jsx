import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserCheck, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlClass } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { taxService } from '@/features/tax/taxService';

/**
 * Find the citizen a record belongs to, by typing part of their name or number.
 *
 * An officer at a counter has a half-remembered name, the last digits of a number, or the
 * property number printed on the bill. The field this replaces made them press a button and
 * then read a list; this searches as they type and lets them pick.
 *
 * What it does NOT do is let typed text stand in for a person. The caller receives the
 * citizen's own database id, chosen from results the server returned — never the characters
 * in the box. Clearing the box clears the selection, so a half-typed name can never be
 * submitted as if someone had been chosen.
 *
 * `ward` narrows the search when the caller is already filtered to one; the server composes
 * it with the text rather than replacing it.
 */
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

export function CitizenSearch({ value, onChange, ward, disabled, label, hint }) {
  const { t } = useTranslation();
  const listId = useId();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  // Identifies the newest request, so a slow early response cannot overwrite a later one.
  const latest = useRef(0);

  // Clicking anywhere else dismisses the list without disturbing the selection.
  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    const q = term.trim();
    if (value || q.length < MIN_CHARS) {
      setResults(null);
      setLoading(false);
      return undefined;
    }
    // One request per pause in typing, not one per keystroke.
    setLoading(true);
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      try {
        const found = await taxService.searchCitizens(q, ward);
        if (ticket !== latest.current) return;
        setResults(found);
        setActive(found.length ? 0 : -1);
        setOpen(true);
      } catch {
        if (ticket !== latest.current) return;
        setResults([]);
        setOpen(true);
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, ward, value]);

  const choose = (c) => {
    onChange(c);
    setOpen(false);
    setTerm('');
    setResults(null);
  };

  const clear = () => {
    onChange(null);
    setTerm('');
    setResults(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || !results?.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) choose(results[active]);
    }
  };

  // Once chosen, the citizen stays on screen while the rest of the form is filled in.
  if (value) {
    return (
      <div className="space-y-1.5">
        <span className="block text-label text-foreground">
          {label ?? t('tax.form.citizenSearch')}
        </span>
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-primary-subtle px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-body text-foreground">
            <UserCheck className="h-4 w-4 shrink-0 text-success-strong" aria-hidden="true" />
            <span className="truncate font-medium">{value.fullName}</span>
            <span className="shrink-0 text-caption text-muted-foreground">{value.mobile}</span>
            {value.ward ? (
              <span className="shrink-0 text-caption text-muted-foreground">· {value.ward}</span>
            ) : null}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('tax.form.clearCitizen')}
            onClick={clear}
            disabled={disabled}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  const showEmpty = open && !loading && results?.length === 0;

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <label htmlFor={`${listId}-input`} className="block text-label text-foreground">
        {label ?? t('tax.form.citizenSearch')}
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id={`${listId}-input`}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 && results?.[active] ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          className={cn(controlClass, 'pl-9 pr-9')}
          placeholder={hint ?? t('tax.form.citizenSearchHint')}
          value={term}
          disabled={disabled}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => results && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}

        {open && results?.length ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-card shadow-lg"
          >
            {results.map((c, i) => (
              <li key={c.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  // Mouse down rather than click: the input's blur must not close the list
                  // before the choice registers.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(c);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'block w-full px-3 py-2 text-left transition-colors duration-150',
                    i === active ? 'bg-primary-subtle' : 'hover:bg-muted/50',
                  )}
                >
                  <span className="block truncate text-body font-medium text-foreground">
                    {c.fullName}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {c.mobile}
                    {c.ward ? ` • ${c.ward}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="text-caption text-muted-foreground" role={showEmpty ? 'status' : undefined}>
        {showEmpty ? t('tax.form.noCitizens') : (hint ?? t('tax.form.citizenSearchHint'))}
      </p>
    </div>
  );
}
