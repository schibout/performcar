import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { usersApi } from "@/lib/api/endpoints/users";
import type { UpdateMePayload, User } from "@/lib/types/user";

// Query keys
export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", id] as const,
};

// Get all users
export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => usersApi.getAll(),
  });
};

// Get single user
export const useUser = (id: string | undefined) => {
  return useQuery({
    queryKey: id ? userKeys.detail(id) : ["users", "invalid"],
    queryFn: () => {
      if (!id) throw new Error("User ID is required");
      return usersApi.getById(id);
    },
    enabled: typeof id === "string",
  });
};

// Create user mutation
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<User, "id">) => usersApi.create(data),
    onSuccess: () => {
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

// Update user mutation
interface UpdateUserParams {
  id: string;
  data: Partial<Omit<User, "id">>;
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateUserParams) => usersApi.update(id, data),
    onSuccess: (data) => {
      // Update both detail and list cache
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

// Delete user mutation
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

// Update current user mutation
export const useUpdateMe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMePayload) => usersApi.updateMe(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
};

// Deactivate own account (starts the 30-day grace window)
export const useDeactivateMe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ password, lang }: { password: string; lang: string }) =>
      usersApi.deactivateMe(password, lang),
    onSuccess: () => {
      // Backend already cleared HttpOnly cookies; drop cached user state so
      // the next navigation picks up the deactivated status on re-login.
      queryClient.clear();
    },
  });
};

// Cancel a pending deletion and restore the account
export const useReactivateMe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => usersApi.reactivateMe(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
};
