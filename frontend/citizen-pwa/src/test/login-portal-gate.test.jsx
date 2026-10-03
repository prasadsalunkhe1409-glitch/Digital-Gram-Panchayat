import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

const loginSession = vi.fn();
vi.mock('@/features/auth/authService', () => ({
  authService: { loginSession: (...a) => loginSession(...a) },
}));

const adoptSession = vi.fn();
const discardSession = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ adoptSession, discardSession }) }));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: Object.assign((...a) => toastError(...a), {
    error: (...a) => toastError(...a),
    success: (...a) => toastSuccess(...a),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, f) => f ?? k, i18n: { language: 'en' } }),
}));

import { LoginForm } from '@/features/auth/components/LoginForm';

const CITIZEN = { id: 'c1', role: 'citizen', fullName: 'Citizen' };
const OFFICER = { id: 'o1', role: 'officer', fullName: 'Officer' };
const ROOT = { id: 'r1', role: 'root_admin', fullName: 'Root Admin' };

const replace = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  delete window.location;
  window.location = { replace };
});

const submit = async (mode, user) => {
  loginSession.mockResolvedValue({ user, token: 'tok-123' });
  render(
    <MemoryRouter>
      <LoginForm mode={mode} />
    </MemoryRouter>,
  );
  const u = userEvent.setup();
  await u.type(screen.getByLabelText(/identifier|email|mobile/i), 'admin@dgp.local');
  await u.type(screen.getByLabelText(/password/i), 'Admin@123');
  await u.click(screen.getByRole('button', { name: /auth\.login/ }));
};

/**
 * The tab is a gate on the account's role, and the role test has to cover every
 * administrative role. Testing for `officer` alone classified a root admin as a citizen: the
 * Officer tab refused them as "belongs to the Villager Portal" — the message in the
 * screenshot — while the Villager tab quietly started a citizen session for an administrator.
 */
describe('a root admin is treated as an administrative account', () => {
  it('is handed to the admin portal from the Officer tab', async () => {
    await submit('officer', ROOT);

    expect(replace).toHaveBeenCalledWith(expect.stringContaining('/auth/callback#token='));
    expect(toastError).not.toHaveBeenCalled();
    // Never stored in the citizen app.
    expect(adoptSession).not.toHaveBeenCalled();
  });

  it('is turned away from the Villager tab, and nothing is kept', async () => {
    await submit('villager', ROOT);

    expect(toastError).toHaveBeenCalledWith('auth.wrongTabOfficer');
    expect(adoptSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    // The poisoned state this bug could leave behind is cleared explicitly.
    expect(discardSession).toHaveBeenCalled();
  });
});

describe('an officer', () => {
  it('is handed to the admin portal from the Officer tab', async () => {
    await submit('officer', OFFICER);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('/auth/callback#token='));
    expect(adoptSession).not.toHaveBeenCalled();
  });

  it('is turned away from the Villager tab, and nothing is kept', async () => {
    await submit('villager', OFFICER);
    expect(toastError).toHaveBeenCalledWith('auth.wrongTabOfficer');
    expect(adoptSession).not.toHaveBeenCalled();
    expect(discardSession).toHaveBeenCalled();
  });
});

describe('a citizen', () => {
  it('starts a session from the Villager tab', async () => {
    await submit('villager', CITIZEN);
    expect(adoptSession).toHaveBeenCalledWith(CITIZEN, 'tok-123');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('is turned away from the Officer tab, and nothing is kept', async () => {
    await submit('officer', CITIZEN);
    expect(toastError).toHaveBeenCalledWith('auth.wrongTabVillager');
    expect(adoptSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(discardSession).toHaveBeenCalled();
  });
});

describe('a genuinely bad password is unchanged', () => {
  it('shows the API message and starts no session', async () => {
    loginSession.mockRejectedValue({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });
    render(
      <MemoryRouter>
        <LoginForm mode="officer" />
      </MemoryRouter>,
    );
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/identifier|email|mobile/i), 'admin@dgp.local');
    await u.type(screen.getByLabelText(/password/i), 'wrong');
    await u.click(screen.getByRole('button', { name: /auth\.login/ }));

    expect(toastError).toHaveBeenCalledWith('Invalid credentials');
    expect(adoptSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('the gate is a UI decision, not an auth change', () => {
  const src = readFileSync(join(SRC, 'features/auth/components/LoginForm.jsx'), 'utf8');

  it('tests every administrative role rather than one of them', () => {
    expect(src).toContain('ADMIN_ROLES.includes(user.role)');
    // The single-role comparison is what misclassified a root admin.
    expect(src).not.toContain('user.role === ROLES.OFFICER');
  });

  it('never alters the account on a mismatch — it only drops local state', () => {
    for (const forbidden of ['isActive', 'passwordHash', 'role =', 'deactivate']) {
      expect(src).not.toContain(forbidden);
    }
    expect(src).toContain('discardSession()');
  });
});
