import { Permission, ROLE_PERMISSIONS, UserRole } from "@/types";

export function getUserPermissions(role: UserRole, extraPermissions: string[] = []): Permission[] {
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  const extras = extraPermissions.filter((p): p is Permission =>
    Object.values(ROLE_PERMISSIONS).flat().includes(p as Permission)
  );
  return [...new Set([...rolePerms, ...extras])];
}

export function hasPermission(permissions: Permission[], required: Permission): boolean {
  return permissions.includes(required);
}
