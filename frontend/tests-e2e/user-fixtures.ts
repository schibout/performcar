import { Permission } from "@/lib/types/permissions";

// What the default role grants: every self-service key, as `/users/me` lists it for
// a standard account. A mocked user without them gets the restricted UI, not the
// standard one, because the frontend gates self-service actions on these keys.
export const SELF_PERMISSIONS = (Object.values(Permission) as Permission[]).filter((permission) =>
  permission.startsWith("self."),
);
