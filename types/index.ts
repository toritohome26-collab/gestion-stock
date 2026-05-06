export type UserRole = "ADMIN" | "MANAGER" | "SELLER" | "ACCOUNTANT" | "READONLY";

export type Permission =
  | "stock.view" | "stock.create" | "stock.edit" | "stock.delete"
  | "sales.view" | "sales.create" | "sales.edit"
  | "office.view" | "office.create"
  | "finances.view" | "finances.create" | "finances.edit" | "finances.delete"
  | "users.view" | "users.create" | "users.edit" | "users.delete"
  | "integrations.view" | "integrations.manage"
  | "calculator.view"
  | "reports.view";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "stock.view", "stock.create", "stock.edit", "stock.delete",
    "sales.view", "sales.create", "sales.edit",
    "office.view", "office.create",
    "finances.view", "finances.create", "finances.edit", "finances.delete",
    "users.view", "users.create", "users.edit", "users.delete",
    "integrations.view", "integrations.manage",
    "calculator.view",
    "reports.view",
  ],
  MANAGER: [
    "stock.view", "stock.create", "stock.edit",
    "sales.view", "sales.create", "sales.edit",
    "office.view", "office.create",
    "finances.view", "finances.create", "finances.edit",
    "users.view",
    "integrations.view",
    "calculator.view",
    "reports.view",
  ],
  SELLER: [
    "stock.view",
    "sales.view",
    "office.view", "office.create",
    "calculator.view",
  ],
  ACCOUNTANT: [
    "stock.view",
    "sales.view",
    "finances.view", "finances.create", "finances.edit",
    "reports.view",
  ],
  READONLY: [
    "stock.view",
    "sales.view",
    "finances.view",
    "reports.view",
  ],
};

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}
