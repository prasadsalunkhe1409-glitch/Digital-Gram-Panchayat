import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, X, Send, Trash2, ArrowRight, Phone, BookOpen } from 'lucide-react';
import { answerQuestion, suggestedTopics, localizedText } from '@dgp/shared';
import { useVillageProfile } from '@/features/village/hooks';

/**
 * Offline help assistant.
 *
 * Deterministic by design — there is no language model here. Every reply is either an authored
 * help topic or an explicit "I'm not sure", because a plausible-but-wrong answer about
 * certificate documents sends a citizen to the office with the wrong papers. The whole knowledge
 * base ships in the bundle, so it answers with no network at all.
 *
 * Presentation: a bottom sheet on phones, an anchored side panel on desktop.
 */
export function HelpAssistant() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'mr' ? 'mr' : 'en';
  const location = useLocation();
  const { data: profile } = useVillageProfile();

  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]); // { id, question, result }
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const endRef = useRef(null);

  const L = (v) => localizedText(v, lang);

  // Context aware: offer guides for the screen the user is actually on, before anything else.
  const suggestions = useMemo(
    () => suggestedTopics({ audience: 'citizen', route: location.pathname, limit: 4 }),
    [location.pathname],
  );

  // Focus the input on open; return focus to the launcher on close (keyboard users must not be
  // dropped at the top of the document).
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else launcherRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Keep the newest reply in view. Guarded: scrollIntoView is missing in some environments
  // (jsdom) and the node may already be unmounted.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [turns]);

  const ask = (text) => {
    const q = String(text || '').trim();
    if (!q) return;
    const result = answerQuestion(q, { audience: 'citizen' });
    setTurns((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, question: q, result }]);
    setQuestion('');
  };

  const officePhone = profile?.leadership?.contactNumbers?.trim();

  if (!open) {
    return (
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('assistant.open')}
        title={t('assistant.open')}
        // Sits above the bottom navigation on mobile so it never covers a nav item.
        /*
         * Always one gap above the bottom bar, at every width. `sm:bottom-6` used to drop it
         * to 24px from 640px up, which put it 38px *inside* a bar that is fixed at every
         * breakpoint — correct on a phone, overlapping on a tablet and a desktop.
         *
         * z-10 rather than z-30: above the page it floats over, below the bar it sits above.
         * The panel this opens keeps its own z-40 and is unaffected.
         *
         * Warm paper with a navy mark, so it reads as a utility resting on the page instead
         * of a piece of the navy bar that has come loose. Gold is not used here — that is the
         * selected-tab colour one row below.
         */
        className="fixed bottom-[calc(var(--citizen-bottom-nav-height)+1rem+env(safe-area-inset-bottom))] right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-card text-primary shadow-lg transition-transform duration-150 hover:bg-primary-subtle active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageCircleQuestion className="h-6 w-6" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-end sm:justify-end sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      {/* Scrim only on mobile, where the sheet covers the screen. */}
      <div className="absolute inset-0 bg-foreground/40 sm:hidden" aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('assistant.title')}
        className="relative flex h-[80dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-overlay sm:h-[32rem] sm:w-[24rem] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-foreground">
              {t('assistant.title')}
            </p>
            <p className="truncate text-caption text-muted-foreground">{t('assistant.subtitle')}</p>
          </div>
          {turns.length > 0 ? (
            <button
              type="button"
              onClick={() => setTurns([])}
              aria-label={t('assistant.clear')}
              title={t('assistant.clear')}
              className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('common.close')}
            className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Conversation */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
          {turns.length === 0 ? (
            <div className="space-y-3">
              <p className="text-body text-foreground">{t('assistant.greeting')}</p>
              <p className="text-caption text-muted-foreground">{t('assistant.trySomething')}</p>
              <ul className="space-y-2">
                {suggestions.map((topic) => (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => ask(L(topic.title))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-caption text-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-accent"
                    >
                      {L(topic.title)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            turns.map((turn) => (
              <div key={turn.id} className="space-y-2">
                {/* What the user asked */}
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-caption text-primary-foreground">
                  {turn.question}
                </p>
                <Reply
                  result={turn.result}
                  lang={lang}
                  t={t}
                  onAsk={ask}
                  officePhone={officePhone}
                />
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex items-center gap-2 border-t border-border px-3 py-3"
        >
          <label htmlFor="assistant-input" className="sr-only">
            {t('assistant.inputLabel')}
          </label>
          <input
            id="assistant-input"
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('assistant.placeholder')}
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-body text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label={t('assistant.send')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors duration-150 hover:bg-primary-hover disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}

/** Renders one assistant reply. Never composes prose — it shows an authored topic or says so. */
function Reply({ result, lang, t, onAsk, officePhone }) {
  const L = (v) => localizedText(v, lang);

  if (result.kind === 'answer') {
    const { topic, alternatives } = result;
    return (
      <div className="w-fit max-w-[92%] space-y-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
        <p className="text-caption font-semibold text-foreground">{L(topic.title)}</p>
        <ol className="space-y-1.5">
          {topic.steps.slice(0, 4).map((s, i) => (
            <li key={i} className="flex gap-2 text-caption text-body-foreground">
              <span className="shrink-0 font-semibold text-primary">{i + 1}.</span>
              <span>{L(s.text)}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          {topic.route ? (
            <Link
              to={topic.route}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-caption font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
            >
              {t('help.takeMeThere')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
          <Link
            to={`/help?topic=${topic.id}`}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-caption font-medium text-foreground transition-colors duration-150 hover:bg-accent"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {t('assistant.fullGuide')}
          </Link>
        </div>
        {alternatives?.length ? (
          <div className="pt-1">
            <p className="text-caption text-muted-foreground">{t('assistant.alsoRelated')}</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {alternatives.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onAsk(L(a.title))}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-caption text-foreground transition-colors duration-150 hover:bg-accent"
                  >
                    {L(a.title)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  // clarify | fallback — the assistant admits it is unsure rather than guessing.
  return (
    <div className="w-fit max-w-[92%] space-y-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
      <p className="text-caption text-foreground">
        {result.kind === 'clarify' ? t('assistant.notSure') : t('assistant.noMatch')}
      </p>
      {result.topics?.length ? (
        <ul className="space-y-1.5">
          {result.topics.map((topic) => (
            <li key={topic.id}>
              <Link
                to={`/help?topic=${topic.id}`}
                className="block rounded-lg border border-border bg-card px-2.5 py-1.5 text-caption text-foreground transition-colors duration-150 hover:bg-accent"
              >
                {L(topic.title)}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/help"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-caption font-medium text-foreground transition-colors duration-150 hover:bg-accent"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {t('help.openCenter')}
        </Link>
        {officePhone ? (
          <a
            href={`tel:${officePhone}`}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-caption font-medium text-foreground transition-colors duration-150 hover:bg-accent"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {t('assistant.callOffice')}
          </a>
        ) : (
          <Link
            to="/directory"
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-caption font-medium text-foreground transition-colors duration-150 hover:bg-accent"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {t('assistant.contactOffice')}
          </Link>
        )}
      </div>
    </div>
  );
}
