'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { UserRole, Profile } from '@/types/qms';
import { rolePermissions } from '@/types/qms';
import {
  Users, Plus, Search, Edit, Shield, Mail, UserCheck, UserX, RotateCcw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const roleColors: Record<UserRole, string> = {
  'admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'quality_manager': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'auditor': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'document_controller': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'executive': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'operator': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const roleLabels: Record<UserRole, string> = {
  'admin': 'Administrator',
  'quality_manager': 'Quality Manager',
  'auditor': 'Auditor',
  'document_controller': 'Document Controller',
  'executive': 'Executive',
  'operator': 'Operator',
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function UserManagementView() {
  const { currentUser, hasPermission } = useAuth();
  const { currentOrg, updateSettings } = useOrganization();
  const store = useQMSStore();
  const profiles = store.profiles;
  const orgMembers = store.orgMembers;

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Add user form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('operator');
  const [addDepartment, setAddDepartment] = useState('');
  const [addJobTitle, setAddJobTitle] = useState('');

  // Edit form
  const [editRole, setEditRole] = useState<UserRole>('operator');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const filteredUsers = profiles.filter(p => {
    const matchesSearch = searchTerm === '' ||
      p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const summaryCounts = {
    total: profiles.length,
    active: orgMembers.filter(m => m.status === 'active').length,
    admins: profiles.filter(p => p.role === 'admin' || p.role === 'quality_manager').length,
  };

  const getMemberStatus = (userId: string) => {
    return orgMembers.find(m => m.userId === userId)?.status || 'active';
  };

  const resetAddForm = () => {
    setAddName(''); setAddEmail(''); setAddRole('operator');
    setAddDepartment(''); setAddJobTitle('');
  };

  const handleAddUser = () => {
    // In demo mode, we just close the dialog
    resetAddForm();
    setShowAddDialog(false);
  };

  const handleEditRole = () => {
    if (!selectedUser) return;
    // In demo mode, we just close the dialog
    setShowEditDialog(false);
  };

  const handleInvite = () => {
    setInviteEmail(''); setInviteRole('member');
    setShowInviteDialog(false);
  };

  const openEdit = (profile: Profile) => {
    setSelectedUser(profile);
    setEditRole(profile.role);
    setShowEditDialog(true);
  };

  const roles: UserRole[] = ['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator'];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage users, roles and permissions</p>
        </div>
        {hasPermission('admin.users') && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { if (currentOrg) updateSettings({ setup_completed: false }); }}>
              <RotateCcw className="h-4 w-4 mr-2" />Reset Setup
            </Button>
            <Button variant="outline" onClick={() => { setInviteEmail(''); setInviteRole('member'); setShowInviteDialog(true); }}>
              <Mail className="h-4 w-4 mr-2" />Invite
            </Button>
            <Button onClick={() => { resetAddForm(); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />Add User
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Total Users</span></div>
            <span className="text-2xl font-bold">{summaryCounts.total}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-green-500" /><span className="text-sm text-muted-foreground">Active</span></div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.active}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-red-500" /><span className="text-sm text-muted-foreground">Admins/QM</span></div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.admins}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[200px]">Email</TableHead>
                  <TableHead className="w-[160px]">Role</TableHead>
                  <TableHead className="w-[140px]">Department</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(profile => {
                  const memberStatus = getMemberStatus(profile.id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {profile.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{profile.fullName || 'Unknown'}</p>
                            {profile.jobTitle && <p className="text-xs text-muted-foreground">{profile.jobTitle}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{profile.email}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', roleColors[profile.role])} variant="secondary">
                          {roleLabels[profile.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{profile.department || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', memberStatus === 'active' ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700')}>
                          {memberStatus === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasPermission('admin.users') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(profile)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Full Name *</Label><Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" /></div>
              <div className="grid gap-2"><Label>Email *</Label><Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="email@company.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Role *</Label>
                <Select value={addRole} onValueChange={(v) => setAddRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Department</Label><Input value={addDepartment} onChange={(e) => setAddDepartment(e.target.value)} placeholder="Department" /></div>
            </div>
            <div className="grid gap-2"><Label>Job Title</Label><Input value={addJobTitle} onChange={(e) => setAddJobTitle(e.target.value)} placeholder="Job title" /></div>

            {/* Permissions Preview */}
            {addRole && (
              <div className="border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-2">Permissions for {roleLabels[addRole]}:</p>
                <div className="flex flex-wrap gap-1">
                  {rolePermissions[addRole].map(p => (
                    <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleAddUser} disabled={!addName || !addEmail}>Add User</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>Edit User: {selectedUser.fullName}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {selectedUser.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{selectedUser.fullName}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                  </SelectContent>
                  </Select>
                </div>

                {/* Permissions Preview */}
                <div className="border rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-2">Permissions for {roleLabels[editRole]}:</p>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {rolePermissions[editRole].map(p => (
                      <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={handleEditRole}>Update Role</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Email *</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com" /></div>
            <div className="grid gap-2">
              <Label>Organization Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member' | 'viewer')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={!inviteEmail}>Send Invitation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
