import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Plus, Search, MoreHorizontal, Shield, UserX, RefreshCcw, Key, LogOut, Trash2 } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Skeleton } from '@/shared/ui/skeleton';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/shared/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const UserManagement: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', role: 'doctor' });

  React.useEffect(() => { document.title = 'User Management | Admin'; }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, statusFilter, page],
    queryFn: () => adminApi.getUsers({ search, role: roleFilter, status: statusFilter, page, limit: 15 }),
  });

  const createMutation = useMutation({
    mutationFn: (p: typeof form) => adminApi.createUser(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setCreateOpen(false); setForm({ name: '', email: '', username: '', password: '', role: 'doctor' }); toast.success('User created'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.changeStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Status updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.changeRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, pw }: { id: string; pw: string }) => adminApi.resetPassword(id, pw),
    onSuccess: () => { setResetPwOpen(null); setNewPw(''); toast.success('Password reset'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (id: string) => adminApi.forceLogout(id),
    onSuccess: (d) => toast.success(d.message),
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.ceil((data?.total || 0) / 15);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">{data?.total || 0} users total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create User</Button>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={roleFilter} onValueChange={v => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !data?.users?.length ? (
            <div className="py-12 text-center text-muted-foreground"><Users className="mx-auto h-12 w-12 opacity-20 mb-3" /><p>No users found</p></div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {data.users.map(u => (
                  <div key={u.id} className="rounded-xl border border-border/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{u.name?.charAt(0)}</AvatarFallback></Avatar>
                        <div><p className="text-sm font-medium">{u.name}</p><p className="text-[10px] text-muted-foreground">@{u.username}</p></div>
                      </div>
                      <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className="text-[10px]">{u.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">{u.role}</span>
                      <span>{u.activeSessions} session(s)</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-hidden rounded-md border border-border/50">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.map(u => (
                      <TableRow key={u.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{u.name?.charAt(0)}</AvatarFallback></Avatar>
                            <div><p className="text-sm font-medium">{u.name}</p><p className="text-[10px] text-muted-foreground">@{u.username} · {u.email}</p></div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-[10px]">{u.role}</Badge></TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${u.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />{u.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{u.activeSessions}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{u.lastLoginAt ? format(new Date(u.lastLoginAt), 'MMM d, HH:mm') : 'Never'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(u.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => roleMutation.mutate({ id: u.id, role: u.role === 'admin' ? 'doctor' : u.role === 'doctor' ? 'receptionist' : 'admin' })}>
                                <Shield className="h-3.5 w-3.5 mr-2" />Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setResetPwOpen(u.id); setNewPw(''); }}>
                                <Key className="h-3.5 w-3.5 mr-2" />Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => forceLogoutMutation.mutate(u.id)}>
                                <LogOut className="h-3.5 w-3.5 mr-2" />Force Logout
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: u.id, status: u.status === 'active' ? 'suspended' : 'active' })}>
                                <UserX className="h-3.5 w-3.5 mr-2" />{u.status === 'active' ? 'Suspend' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteMutation.mutate(u.id)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create User</DialogTitle><DialogDescription>Add a new team member</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPwOpen} onOpenChange={() => setResetPwOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle><DialogDescription>Enter a new password for this user</DialogDescription></DialogHeader>
          <Input placeholder="New password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwOpen(null)}>Cancel</Button>
            <Button onClick={() => resetPwOpen && resetPwMutation.mutate({ id: resetPwOpen, pw: newPw })} disabled={resetPwMutation.isPending || newPw.length < 6}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};


export default UserManagement;
