import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WardFilter, wardLabel } from '@/components/WardFilter';
import { useSetUserWard } from './hooks';

/**
 * A citizen's ward in the list, editable in place.
 *
 * Inline rather than on a detail page because the task this exists for is a sweep: an officer
 * works through the accounts that predate the ward field and assigns each one. Making that a
 * round trip per citizen would be the difference between doing it and not.
 *
 * The control offers the six real wards only — `unset` is a filter token, not something a
 * person can be assigned to, so there is no way to clear a ward back to nothing from here.
 */
export function WardCell({ user }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.ward ?? '');
  const setWard = useSetUserWard();

  const save = () => {
    if (!value) return;
    setWard.mutate(
      { id: user.id, ward: value },
      {
        onSuccess: () => {
          toast.success(t('ward.assigned'));
          setEditing(false);
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || t('ward.assignFailed')),
      },
    );
  };

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        {/* Never blank and never guessed: an account with no ward says so in words. */}
        <span className={user.ward ? 'text-foreground' : 'text-muted-foreground'}>
          {wardLabel(user.ward, t)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${t('ward.assign')} — ${user.fullName}`}
          onClick={() => {
            setValue(user.ward ?? '');
            setEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <WardFilter
        value={value}
        onChange={setValue}
        variant="assign"
        includeAll={false}
        className="w-32"
        disabled={setWard.isPending}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('common.save')}
        disabled={!value || setWard.isPending}
        onClick={save}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('common.close')}
        onClick={() => setEditing(false)}
      >
        <X className="h-4 w-4" />
      </Button>
    </span>
  );
}
