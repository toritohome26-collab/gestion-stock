"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Plus, Edit2, Users } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { ROLE_PERMISSIONS, type Permission, type UserRole } from "@/types";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "ADMIN", label: "Administrador", description: "Acceso total" },
  { value: "MANAGER", label: "Gerente", description: "Gestión completa excepto usuarios" },
  { value: "SELLER", label: "Vendedor", description: "Stock, ventas y calculadora" },
  { value: "ACCOUNTANT", label: "Contador", description: "Finanzas y reportes" },
  { value: "READONLY", label: "Solo lectura", description: "Solo visualización" },
];

const ALL_PERMISSIONS = Object.values(ROLE_PERMISSIONS).flat().filter((v, i, a) => a.indexOf(v) === i);

interface User {
  id: string; name: string; email: string; role: string;
  permissions: string; isActive: boolean; createdAt: string;
}

const empty = { name: "", email: "", password: "", role: "SELLER" as UserRole, extraPermissions: [] as string[], isActive: true };

export default function UsuariosPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/users");
    if (!r.ok) { setLoading(false); return; }
    const data = await r.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditUser(null);
    setForm({ ...empty });
    setDialogOpen(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({
      name: u.name, email: u.email, password: "",
      role: u.role as UserRole,
      extraPermissions: JSON.parse(u.permissions || "[]"),
      isActive: u.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.email) { toast("Nombre y email son requeridos", "error"); return; }
    if (!editUser && !form.password) { toast("La contraseña es requerida para usuarios nuevos", "error"); return; }
    setSaving(true);
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast(editUser ? "Usuario actualizado" : "Usuario creado", "success");
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast(e.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...u, extraPermissions: JSON.parse(u.permissions || "[]"), isActive: !u.isActive }),
    });
    toast(u.isActive ? "Usuario desactivado" : "Usuario activado", "success");
    load();
  }

  const rolePerms = ROLE_PERMISSIONS[form.role] || [];
  const extraPerms = form.extraPermissions.filter(p => !rolePerms.includes(p as Permission));

  return (
    <div>
      <Header title="Usuarios" subtitle="Gestión de accesos y permisos" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo usuario
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando...</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay usuarios</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                          {ROLES.find(r => r.value === u.role)?.label || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "success" : "destructive"}>
                          {u.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}
                            className={u.isActive ? "text-red-500" : "text-green-600"}>
                            {u.isActive ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editUser ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!!editUser} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{editUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}</Label>
              <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={v => setForm({...form, role: v as UserRole, extraPermissions: []})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label} — {r.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Permisos del rol "{ROLES.find(r => r.value === form.role)?.label}"</Label>
              <div className="rounded-lg bg-gray-50 p-3 flex flex-wrap gap-1">
                {rolePerms.map(p => (
                  <span key={p} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{p}</span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Permisos adicionales</Label>
              <div className="rounded-lg border p-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {ALL_PERMISSIONS.filter(p => !rolePerms.includes(p)).map(p => (
                  <label key={p} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={form.extraPermissions.includes(p)}
                      onChange={e => {
                        setForm({
                          ...form,
                          extraPermissions: e.target.checked
                            ? [...form.extraPermissions, p]
                            : form.extraPermissions.filter(x => x !== p),
                        });
                      }}
                    />
                    <span className="text-xs text-gray-600">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
