import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Lock, Mail, User as UserIcon, Loader2, Plus, Users, LogOut, Home, Shield, UserCheck, Pencil, Trash2, MoreHorizontal } from "lucide-react";

interface User {
  id: number;
  nome: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}

interface UsersPageProps {
  user: User | null;
  onLogout: () => void;
}

export default function UsersPage({ user, onLogout }: UsersPageProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSenha, setEditSenha] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar lista de usuarios
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao buscar usuarios");
      }
      return response.json();
    },
  });

  // Mutation para criar usuario
  const createUserMutation = useMutation({
    mutationFn: async (data: { nome: string; email: string; senha: string; role: string }) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar usuario");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuario criado!", description: "O usuario foi criado com sucesso." });
      setIsDialogOpen(false);
      resetCreateForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar usuario", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para editar usuario
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { nome?: string; email?: string; senha?: string } }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar usuario");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuario atualizado!", description: "O usuario foi atualizado com sucesso." });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      resetEditForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar usuario", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para excluir usuario
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erro ao excluir usuario");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuario excluido!", description: "O usuario foi excluido com sucesso." });
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir usuario", description: error.message, variant: "destructive" });
    },
  });

  const resetCreateForm = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setRole("user");
  };

  const resetEditForm = () => {
    setEditNome("");
    setEditEmail("");
    setEditSenha("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !senha) {
      toast({ title: "Campos obrigatorios", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    if (senha.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter no minimo 6 caracteres.", variant: "destructive" });
      return;
    }
    createUserMutation.mutate({ nome, email, senha, role });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const data: { nome?: string; email?: string; senha?: string } = {};
    if (editNome && editNome !== editingUser.nome) data.nome = editNome;
    if (editEmail && editEmail !== editingUser.email) data.email = editEmail;
    if (editSenha) data.senha = editSenha;

    if (Object.keys(data).length === 0) {
      toast({ title: "Nenhuma alteracao", description: "Modifique pelo menos um campo.", variant: "destructive" });
      return;
    }

    if (editSenha && editSenha.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter no minimo 6 caracteres.", variant: "destructive" });
      return;
    }

    updateUserMutation.mutate({ id: editingUser.id, data });
  };

  const openEditDialog = (u: User) => {
    setEditingUser(u);
    setEditNome(u.nome);
    setEditEmail(u.email);
    setEditSenha("");
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (u: User) => {
    setDeletingUser(u);
    setIsDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              Gerenciamento de Usuarios
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Crie e gerencie os usuarios do sistema.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
              <Home className="h-4 w-4" />
              Voltar
            </Button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <UserIcon className="h-4 w-4" />
                    {user.nome}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm text-slate-500">{user.email}</div>
                  <div className="px-2 py-1.5">
                    <Badge variant="outline" className="text-xs">
                      {user.role === "admin" ? "Administrador" : "Usuario"}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Card de usuarios */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Usuarios Cadastrados</CardTitle>
              <CardDescription>
                {users ? `${users.length} usuario(s) encontrado(s)` : "Carregando..."}
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuario</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input id="nome" type="text" placeholder="Nome completo" className="pl-9" value={nome} onChange={(e) => setNome(e.target.value)} disabled={createUserMutation.isPending} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input id="email" type="email" placeholder="email@exemplo.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} disabled={createUserMutation.isPending} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input id="senha" type="password" placeholder="Minimo 6 caracteres" className="pl-9" value={senha} onChange={(e) => setSenha(e.target.value)} disabled={createUserMutation.isPending} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Tipo de Usuario</Label>
                    <Select value={role} onValueChange={(value: "admin" | "user") => setRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario Comum</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Usuario"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Nome</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Tipo</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Criado em</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-medium">{u.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className={u.role === "admin" ? "bg-purple-500" : ""}>
                            {u.role === "admin" ? <><Shield className="h-3 w-3 mr-1" />Admin</> : <><UserCheck className="h-3 w-3 mr-1" />Usuario</>}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(u)} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteDialog(u)} className="text-red-600 cursor-pointer" disabled={u.id === user?.id}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhum usuario cadastrado.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de edicao */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="editNome">Nome</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="editNome" type="text" placeholder="Nome completo" className="pl-9" value={editNome} onChange={(e) => setEditNome(e.target.value)} disabled={updateUserMutation.isPending} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="editEmail" type="email" placeholder="email@exemplo.com" className="pl-9" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={updateUserMutation.isPending} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSenha">Nova Senha (deixe vazio para manter)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="editSenha" type="password" placeholder="Minimo 6 caracteres" className="pl-9" value={editSenha} onChange={(e) => setEditSenha(e.target.value)} disabled={updateUserMutation.isPending} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmacao de exclusao */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o usuario <strong>{deletingUser?.nome}</strong>? Esta acao nao pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.id)} className="bg-red-600 hover:bg-red-700">
                {deleteUserMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Excluindo...</> : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
