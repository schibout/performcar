// Apart from the hooks so `use-admin` can use them: `use-rbac` imports `adminKeys`.
export const rbacKeys = {
  all: ["admin", "rbac"] as const,
  catalog: ["admin", "rbac", "catalog"] as const,
  roles: ["admin", "rbac", "roles"] as const,
  permissionSets: ["admin", "rbac", "permissionSets"] as const,
  accessPrefix: ["admin", "rbac", "access"] as const,
  access: (userId: string) => ["admin", "rbac", "access", userId] as const,
};
