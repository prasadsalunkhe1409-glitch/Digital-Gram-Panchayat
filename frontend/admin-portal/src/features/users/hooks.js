import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, adminAccountService } from './userService';

export const userKeys = {
  list: (params) => ['admin-users', 'list', params ?? {}],
  detail: (id) => ['admin-users', 'detail', id],
};

export function useUsers(params) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useUser(id) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getOne(id),
    enabled: Boolean(id),
  });
}

export function useSetUserWard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ward }) => userService.setWard(id, ward),
    onSuccess: (updated) => {
      if (updated?.id) qc.setQueryData(userKeys.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: ['admin-users', 'list'] });
    },
  });
}

export function useSetUserStatus(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id: uid, status }) => userService.setStatus(uid ?? id, status),
    onSuccess: (updated) => {
      if (updated?.id) qc.setQueryData(userKeys.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: ['admin-users', 'list'] });
    },
  });
}

/* ------------------------------------------------------- root admin: officer accounts */

const adminAccountKeys = { all: ['admin-accounts'] };

export function useAdminAccounts(enabled = true) {
  return useQuery({
    queryKey: adminAccountKeys.all,
    queryFn: () => adminAccountService.list(),
    enabled,
  });
}

export function useAdminAccountMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminAccountKeys.all });
  return {
    create: useMutation({
      mutationFn: (values) => adminAccountService.create(values),
      onSuccess: invalidate,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, status }) => adminAccountService.setStatus(id, status),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id) => adminAccountService.remove(id),
      onSuccess: invalidate,
    }),
  };
}
