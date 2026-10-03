import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, f) => f ?? k, i18n: { language: 'en' } }),
}));

import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';

/**
 * Typing inside a dialog.
 *
 * Every caller passes an inline `onClose={() => setOpen(false)}`, so its identity changes on
 * every render. The dialog's open/close effect used to list `onClose` as a dependency, so a
 * single keystroke re-ran it: the cleanup restored focus to whatever had opened the dialog,
 * and the field lost focus after one character. These harnesses reproduce that exactly — an
 * inline handler and a parent that re-renders on each change — so the test fails against the
 * old dependency array rather than merely describing the fix.
 */
function Harness({ multiline = false }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New meeting">
        <Field label="Title">
          {({ id }) =>
            multiline ? (
              <textarea id={id} value={value} onChange={(e) => setValue(e.target.value)} />
            ) : (
              <input id={id} value={value} onChange={(e) => setValue(e.target.value)} />
            )
          }
        </Field>
      </Dialog>
    </div>
  );
}

/** A repeated field added while the dialog is open — the agenda/options pattern. */
function DynamicHarness() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(['']);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New poll">
        {items.map((v, i) => (
          <input
            key={i}
            aria-label={`option ${i + 1}`}
            value={v}
            onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
        <button type="button" onClick={() => setItems((prev) => [...prev, ''])}>
          add option
        </button>
      </Dialog>
    </div>
  );
}

describe('typing inside an admin dialog', () => {
  it('keeps the whole string, not just the first character', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));

    const input = screen.getByLabelText('Title');
    await user.click(input);
    await user.type(input, 'Village Development Meeting');

    expect(input).toHaveValue('Village Development Meeting');
  });

  it('leaves focus in the field after every keystroke', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));

    const input = screen.getByLabelText('Title');
    await user.click(input);
    for (const ch of 'Gram') {
      await user.keyboard(ch);
      // The old effect moved focus to the trigger, then to the dialog panel.
      expect(document.activeElement).toBe(input);
    }
    expect(input).toHaveValue('Gram');
  });

  it('does the same in a textarea', async () => {
    const user = userEvent.setup();
    render(<Harness multiline />);
    await user.click(screen.getByRole('button', { name: 'open' }));

    const area = screen.getByLabelText('Title');
    await user.click(area);
    await user.type(area, 'Monsoon drain cleaning');

    expect(area).toHaveValue('Monsoon drain cleaning');
  });

  it('does the same in a Marathi field', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));

    const input = screen.getByLabelText('Title');
    await user.click(input);
    await user.type(input, 'ग्रामसभा बैठक');

    expect(input).toHaveValue('ग्रामसभा बैठक');
  });

  it('does the same in a field added after the dialog opened', async () => {
    const user = userEvent.setup();
    render(<DynamicHarness />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'add option' }));

    const second = screen.getByLabelText('option 2');
    await user.click(second);
    await user.type(second, 'Yes');

    expect(second).toHaveValue('Yes');
    expect(screen.getByLabelText('option 1')).toHaveValue('');
  });

  it('still closes on Escape, using the latest handler', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns focus to whatever opened it, once, on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'open' });
    await user.click(trigger);

    const input = screen.getByLabelText('Title');
    await user.click(input);
    await user.type(input, 'abc');
    await user.keyboard('{Escape}');

    // Typing must not have overwritten the restore target with the dialog's own panel.
    expect(document.activeElement).toBe(trigger);
  });

  it('does not thrash the page scroll lock while typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));

    const input = screen.getByLabelText('Title');
    await user.click(input);
    await user.type(input, 'hello');
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
