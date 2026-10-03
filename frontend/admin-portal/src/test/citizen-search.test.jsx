import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const searchCitizens = vi.fn();
vi.mock('@/features/tax/taxService', () => ({
  taxService: { searchCitizens: (...a) => searchCitizens(...a) },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, f) => f ?? k, i18n: { language: 'en' } }),
}));

import { CitizenSearch } from '@/components/CitizenSearch';

const RAHUL = {
  id: '6a50cd68534029b7f5cb5f05',
  fullName: 'Rahul Patil',
  mobile: '9689181064',
  ward: 'Ward 3',
};
const ROHAN = {
  id: '6a50cd68534029b7f5cb5f06',
  fullName: 'Rohan Patil',
  mobile: '9876543210',
  ward: null,
};

const box = () => screen.getByRole('combobox');

beforeEach(() => {
  searchCitizens.mockReset();
  searchCitizens.mockResolvedValue([RAHUL, ROHAN]);
});
afterEach(() => vi.useRealTimers());

/**
 * The officer types part of a name or number and picks a person. The field this replaced made
 * them type a whole ten-digit mobile and press a button.
 */
describe('citizen autocomplete', () => {
  it('searches on what was typed and lists the matches', async () => {
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={() => {}} />);

    await user.type(box(), '9689');
    await waitFor(() => expect(searchCitizens).toHaveBeenCalledWith('9689', undefined));

    const list = await screen.findByRole('listbox');
    expect(within(list).getByText('Rahul Patil')).toBeInTheDocument();
    // Mobile and ward are shown so two people with the same name can be told apart.
    expect(within(list).getByText(/9689181064/)).toHaveTextContent('Ward 3');
  });

  it('waits for a pause in typing rather than firing on every keystroke', async () => {
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={() => {}} />);

    await user.type(box(), 'Rahul');
    await waitFor(() => expect(searchCitizens).toHaveBeenCalled());
    // Five characters, one request.
    expect(searchCitizens).toHaveBeenCalledTimes(1);
    expect(searchCitizens).toHaveBeenCalledWith('Rahul', undefined);
  });

  it('does not search on a single character', async () => {
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={() => {}} />);

    await user.type(box(), 'R');
    await new Promise((r) => setTimeout(r, 400));
    expect(searchCitizens).not.toHaveBeenCalled();
  });

  it('hands the caller the citizen record, not the typed text', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={onChange} />);

    await user.type(box(), 'Rah');
    await screen.findByRole('listbox');
    await user.click(screen.getByText('Rahul Patil'));

    // The database id is what reaches the form; the characters in the box never do.
    expect(onChange).toHaveBeenCalledWith(RAHUL);
    expect(onChange.mock.calls[0][0].id).toBe('6a50cd68534029b7f5cb5f05');
  });

  it('selects with the keyboard: arrow down then Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={onChange} />);

    await user.type(box(), 'Patil');
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith(ROHAN); // first result is active, arrow moves to second
  });

  it('closes on Escape without choosing anybody', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={onChange} />);

    await user.type(box(), 'Patil');
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes when the officer clicks away', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <CitizenSearch value={null} onChange={() => {}} />
        <button type="button">elsewhere</button>
      </div>,
    );

    await user.type(box(), 'Patil');
    await screen.findByRole('listbox');
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('says so plainly when nobody matches', async () => {
    searchCitizens.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={() => {}} />);

    await user.type(box(), 'Nobody');
    expect(await screen.findByText('tax.form.noCitizens')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps the chosen citizen on screen while the form is filled in', () => {
    render(<CitizenSearch value={RAHUL} onChange={() => {}} />);

    expect(screen.getByText('Rahul Patil')).toBeInTheDocument();
    expect(screen.getByText('9689181064')).toBeInTheDocument();
    // No search box while someone is selected — clearing is the way back.
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('clears the selection on request', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CitizenSearch value={RAHUL} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'tax.form.clearCitizen' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows a citizen with no ward without inventing one', async () => {
    searchCitizens.mockResolvedValue([ROHAN]);
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={() => {}} />);

    await user.type(box(), 'Rohan');
    const list = await screen.findByRole('listbox');
    expect(within(list).getByText('9876543210')).toBeInTheDocument();
    expect(within(list).queryByText(/Ward/)).toBeNull();
  });

  it('passes the ward filter through when the screen is already narrowed', async () => {
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={() => {}} ward="Ward 3" />);

    await user.type(box(), 'Rah');
    await waitFor(() => expect(searchCitizens).toHaveBeenCalledWith('Rah', 'Ward 3'));
  });

  it('survives a failed search instead of breaking the form', async () => {
    searchCitizens.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={() => {}} />);

    await user.type(box(), 'Rah');
    expect(await screen.findByText('tax.form.noCitizens')).toBeInTheDocument();
  });

  it('is announced as a combobox with its listbox', async () => {
    const user = userEvent.setup();
    render(<CitizenSearch value={null} onChange={() => {}} />);

    expect(box()).toHaveAttribute('aria-expanded', 'false');
    await user.type(box(), 'Rah');
    await screen.findByRole('listbox');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(box()).toHaveAttribute('aria-controls', box().getAttribute('aria-controls'));
  });
});

/** The form must never raise a bill against typed text. */
describe('the tax form cannot be submitted without a chosen citizen', () => {
  it('guards on the selection and sends the database id', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'features/tax/TaxForm.jsx'),
      'utf8',
    );
    expect(src).toContain('if (!citizen)');
    expect(src).toContain('citizenId: citizen.id');
    expect(src).toContain('<CitizenSearch');
    // The old press-a-button-to-find flow is gone.
    expect(src).not.toContain('lookingUp');
    expect(src).not.toContain('taxService.searchCitizens');
  });
});
