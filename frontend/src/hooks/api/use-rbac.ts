import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rbacApi } from "@/lib/api/endpoints/rbac";
import type {
  AssignmentsUpdatePayload,
  PermissionSetCreatePayload,
  PermissionSetUpdatePayload,
  RoleCreatePayload,
  RoleUpdatePayload,
  UserAccess,
} from "@/lib/types/rbac";

import { rbacKeys } from "./rbac-keys";
import { adminKeys } from "./use-admin";

export { rbacKeys };

type QueryClient = ReturnType<typeof useQueryClient>;

// Editing a set changes what its roles give, and editing a role changes what
// every holder gets: refresh the lists and every cached access view.
const invalidateElements = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: rbacKeys.roles });
  queryClient.invalidateQueries({ queryKey: rbacKeys.permissionSets });
  queryClient.invalidateQueries({ queryKey: rbacKeys.accessPrefix });
};

export const useRbacPermissionCatalog = (enabled = true) =>
  useQuery({
    queryKey: rbacKeys.catalog,
    queryFn: () => rbacApi.getPermissionCatalog(),
    enabled,
    staleTime: Infinity,
  });

export const useRoles = (enabled = true) =>
  useQuery({
    queryKey: rbacKeys.roles,
    queryFn: () => rbacApi.listRoles(),
    enabled,
  });

export const usePermissionSets = (enabled = true) =>
  useQuery({
    queryKey: rbacKeys.permissionSets,
    queryFn: () => rbacApi.listPermissionSets(),
    enabled,
  });

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoleCreatePayload) => rbacApi.createRole(payload),
    onSuccess: () => {
      invalidateElements(queryClient);
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RoleUpdatePayload }) =>
      rbacApi.updateRole(id, payload),
    onSuccess: () => {
      invalidateElements(queryClient);
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rbacApi.deleteRole(id),
    onSuccess: () => {
      invalidateElements(queryClient);
    },
  });
};

export const useCreatePermissionSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PermissionSetCreatePayload) => rbacApi.createPermissionSet(payload),
    onSuccess: () => {
      invalidateElements(queryClient);
    },
  });
};

export const useUpdatePermissionSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PermissionSetUpdatePayload }) =>
      rbacApi.updatePermissionSet(id, payload),
    onSuccess: () => {
      invalidateElements(queryClient);
    },
  });
};

export const useDeletePermissionSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rbacApi.deletePermissionSet(id),
    onSuccess: () => {
      invalidateElements(queryClient);
    },
  });
};

export const useUserAccess = (userId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: userId ? rbacKeys.access(userId) : ["admin", "rbac", "access", "invalid"],
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      return rbacApi.getUserAccess(userId);
    },
    enabled: Boolean(userId) && enabled,
    // A 403 means the viewer lacks admins:read for this target: not worth retrying.
    retry: false,
  });

// An assignment can promote a user to the admin panel or demote an admin: the
// account itself and every list showing its tier must be refreshed too.
const useAssignmentMutation = (
  call: (userId: string, payload: AssignmentsUpdatePayload) => Promise<UserAccess>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: AssignmentsUpdatePayload }) =>
      call(userId, payload),
    onSuccess: (access, { userId }) => {
      queryClient.setQueryData(rbacKeys.access(userId), access);
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.usersListPrefix });
      queryClient.invalidateQueries({ queryKey: adminKeys.adminsPrefix });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats });
    },
  });
};

export const useSetUserRoles = () => useAssignmentMutation(rbacApi.setUserRoles);

export const useSetUserPermissionSets = () => useAssignmentMutation(rbacApi.setUserPermissionSets);
