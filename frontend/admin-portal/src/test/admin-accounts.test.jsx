import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import en from '@/locales/en/common.json';
import mrLocale from '@/locales/mr/common.json';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(SRC, rel), 'utf8');

const authUser = { current: null };
vi.mock('@/store', () => ({ useAuth: () => ({ user: authUser.current }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, f) => f ?? k, i18n: { language: 'en' } }),
}));

const accounts = { data: undefined, isLoading: false };
const removeMutate = vi.fn();
const mutations = {
  create: { mutate: vi.fn(), isPending: false },
  setStatus: { mutate: vi.fn(), isPending: false },
  remove: { mutate: (...a) => removeMutate(...a), isPending: false },
};
vi.mock('@/features/users/hooks', () => ({
  useAdminAccounts: () => accounts,
  useAdminAccountMutations: () => mutations,
}));

import { AdminAccounts } from '@/features/users/AdminAccounts';

const ROOT = { id: 'r1', role: 'root_admin' };
const OFFICER = { id: 'o1', role: 'officer' };

beforeEach(() => {
  authUser.current = null;
  accounts.data = [
    {
      id: 'r1',
      fullName: 'Root Admin',
      email: 'root@dgp.local',
      role: 'root_admin',
      isActive: true,
      ward: null,
      createdAt: null,
    },
    {
      id: 'o1',
      fullName: 'Panchayat Officer',
      email: 'officer@dgp.local',
      role: 'officer',
      isActive: true,
      ward: 'Ward 3',
      createdAt: null,
    },
  ];
  accounts.isLoading = false;
  removeMutate.mockReset();
});

/**
 * The panel is hidden from an ordinary officer. Hiding it is a courtesy — the API refuses
 * them regardless — but an officer should not be shown a control they cannot use.
 */
describe('who sees administrator management', () => {
  it('renders nothing for an ordinary officer', () => {
    authUser.current = OFFICER;
    const { container } = render(<AdminAccounts />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when nobody is signed in', () => {
    const { container } = render(<AdminAccounts />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders for a root admin', () => {
    authUser.current = ROOT;
    render(<AdminAccounts />);
    expect(screen.getByRole('heading', { name: 'admins.title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admins\.add/ })).toBeInTheDocument();
  });
});

describe('the account list', () => {
  beforeEach(() => {
    authUser.current = ROOT;
  });

  it('distinguishes a root admin from an officer', () => {
    render(<AdminAccounts />);
    expect(screen.getByText('admins.roleRoot')).toBeInTheDocument();
    expect(screen.getByText('admins.roleOfficer')).toBeInTheDocument();
  });

  it('offers no deactivate control against the signed-in root admin', () => {
    render(<AdminAccounts />);
    // Their own row says "You" instead; the API refuses self-deactivation too.
    expect(screen.getByText('admins.you')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'admins.deactivate' })).toHaveLength(1);
  });

  it('shows no password or hash for any account', () => {
    const { container } = render(<AdminAccounts />);
    expect(container.textContent).not.toMatch(/passwordHash|password/i);
  });
});

/**
 * Permanent deletion sits beside deactivation and is deliberately harder to reach: it is
 * offered for officers only, never for a root admin, and never without confirming.
 */
describe('permanent deletion', () => {
  beforeEach(() => {
    authUser.current = ROOT;
  });

  it('offers delete for an officer but not for a root admin', () => {
    render(<AdminAccounts />);
    // Two accounts in the list; only the officer row carries a delete control.
    const deletes = screen.getAllByRole('button', { name: /admins\.delete/ });
    expect(deletes).toHaveLength(1);
    expect(deletes[0]).toHaveAccessibleName(expect.stringContaining('Panchayat Officer'));
  });

  it('asks before deleting, and does nothing until confirmed', async () => {
    const user = userEvent.setup();
    render(<AdminAccounts />);

    await user.click(screen.getByRole('button', { name: /admins\.delete/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('admins.deleteBody')).toBeInTheDocument();
    // Opening the confirmation must not have deleted anything.
    expect(removeMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'admins.deleteCancel' }));
    expect(removeMutate).not.toHaveBeenCalled();
  });

  it('deletes the chosen account once confirmed', async () => {
    const user = userEvent.setup();
    render(<AdminAccounts />);

    await user.click(screen.getByRole('button', { name: /admins\.delete/ }));
    await user.click(screen.getByRole('button', { name: 'admins.deleteConfirm' }));

    expect(removeMutate).toHaveBeenCalledTimes(1);
    expect(removeMutate.mock.calls[0][0]).toBe('o1');
  });

  it('spells out the difference between deactivating and deleting', () => {
    render(<AdminAccounts />);
    expect(screen.getByText('admins.deactivateHint')).toBeInTheDocument();
  });
});

describe('the component contract', () => {
  const src = read('features/users/AdminAccounts.jsx');

  it('never offers a way to create a root admin', () => {
    // No role selector at all: the API always writes `officer`.
    expect(src).not.toContain('ROLES.ROOT_ADMIN,');
    expect(src).not.toMatch(/name=['"]role['"]/);
    expect(src).not.toContain('value={form.role}');
  });

  it('removes by deactivating rather than deleting', () => {
    expect(src).toContain('setStatus');
    expect(src).not.toMatch(/\bdelete\b.*account/i);
  });

  it('is wired to the root-admin endpoints only', () => {
    const service = read('features/users/userService.js');
    expect(service).toContain("apiClient.get('/admin/admins')");
    expect(service).toContain("apiClient.post('/admin/admins'");
    expect(service).toContain('/admin/admins/${id}/status');
  });

  it('leaves the existing citizen user management untouched', () => {
    const list = read('features/users/UsersList.jsx');
    // The citizen table and its filters are still there, with the panel appended below.
    expect(list).toContain('WardCell');
    expect(list).toContain('useUsers');
    expect(list).toContain('<AdminAccounts />');
  });

  it('is translated in both languages', () => {
    for (const key of ['title', 'add', 'deactivate', 'roleRoot', 'roleOfficer', 'passwordHint']) {
      expect(en.admins[key]).toBeTruthy();
      expect(mrLocale.admins[key]).toBeTruthy();
    }
  });
});
