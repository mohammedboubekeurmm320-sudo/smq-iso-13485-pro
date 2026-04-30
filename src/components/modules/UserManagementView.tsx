'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { UserRole, Profile, Permission } from '@/types/qms';
import { rolePermissions } from '@/types/qms';
import { cn, formatDate } from '@/lib/utils';
import {
  Users, Plus, Search, Edit, Shield, Mail, UserCheck, UserX, RotateCcw,
  Eye, ChevronRight, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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

// Group permissions by module for a nicer display
const permissionGroups: Record<string, { label: string; permissions: Permission[] }> = {
  documents: {
    label: 'Documents',
    permissions: ['documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve'],
  },
  capa: {
    label: 'CAPA',
    permissions: ['capa.create', 'capa.read', 'capa.update', 'capa.delete', 'capa.approve'],
  },
  ncr: {
    label: 'NCR',
    permissions: ['ncr.create', 'ncr.read', 'ncr.update', 'ncr.delete', 'ncr.approve'],
  },
  audit: {
    label: 'Audits',
    permissions: ['audit.create', 'audit.read', 'audit.update', 'audit.delete'],
  },
  training: {
    label: 'Training',
    permissions: ['training.create', 'training.read', 'training.update', 'training.delete'],
  },
  risk: {
    label: 'Risk',
    permissions: ['risk.create', 'risk.read', 'risk.update', 'risk.delete'],
  },
  batch: {
    label: 'Batch Records',
    permissions: ['batch.create', 'batch.read', 'batch.update', 'batch.delete', 'batch.release'],
  },
  supplier: {
    label: 'Suppliers',
    permissions: ['supplier.create', 'supplier.read', 'supplier.update', 'supplier.delete'],
  },
  reports: {
    label: 'Reports',
    permissions: ['reports.view', 'reports.export'],
  },
  compliance: {
    label: 'Compliance',
    permissions: ['compliance.view', 'compliance.manage'],
  },
  admin: {
    label: 'Administration',
    permissions: ['admin.users', 'admin.settings', 'admin.audit_trail'],
  },
};

function PermissionSummary({ role }: { role: UserRole }) {
  const permissions = rolePermissions[role];
  return (
    <div className="space-y-2">
      {Object.entries(permissionGroups).map(([key, group]) => {
        const matchedPerms = group.permissions.filter(p => permissions.includes(p));
        if (matchedPerms.length === 0) return null;
        return (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className="font-medium w-32 text-muted-foreground">{group.label}</span>
            <div className="flex flex-wrap gap-1">
              {group.permissions.map(p => {
                const has = permissions.includes(p);
                const shortName = p.split('.')[1];
                return (
                  <Badge
                    key={p}
                    variant={has ? 'default' : 'outline'}
                    className={cn(
                      'text-[10px]',
                      has ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100' : 'text-muted-foreground opacity-40'
                    )}
                  >
                    {has ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                    {shortName}
                  </Badge>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Add user form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('operator');
  const [addDepartment, setAddDepartment] = useState('');
  const [addJobTitle, setAddJobTitle] = useState('');

  // Edit form (within detail dialog)
  const [editRole, setEditRole] = useState<UserRole>('operator');
  const [editDepartment, setEditDepartment] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const filteredUsers = profiles.filter(p => {
    const matchesSearch = searchTerm === '' ||
      p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.department && p.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.jobTitle && p.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const summaryCounts = {
    total: profiles.length,
    active: orgMembers.filter(m => m.status === 'active').length,
    admins: profiles.filter(p => p.role === 'admin' || p.role === 'quality_manager').length,
    inactive: orgMembers.filter(m => m.status === 'inactive').length,
  };

  const getMemberStatus = (userId: string) => {
    return orgMembers.find(m => m.userId === userId)?.status || 'active';
  };

  const resetAddForm = () => {
    setAddName(''); setAddEmail(''); setAddRole('operator');
    setAddDepartment(''); setAddJobTitle('');
  };

  const handleAddUser = () => {
    if (!addName || !addEmail) return;
    const newProfile: Profile = {
      id: `user-${Date.now()}`,
      email: addEmail,
      fullName: addName,
      role: addRole,
      department: addDepartment || undefined,
      jobTitle: addJobTitle || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addProfile(newProfile);
    // Also add an org member entry
    resetAddForm();
    setShowAddDialog(false);
  };

  const handleSaveProfile = () => {
    if (!selectedUser) return;
    store.updateProfile(selectedUser.id, {
      role: editRole,
      department: editDepartment || undefined,
      jobTitle: editJobTitle || undefined,
    });
    setSelectedUser({
      ...selectedUser,
      role: editRole,
      department: editDepartment || undefined,
      jobTitle: editJobTitle || undefined,
    });
    setIsEditing(false);
  };

  const handleInvite = () => {
    setInviteEmail(''); setInviteRole('member');
    setShowInviteDialog(false);
  };

  const openDetail = (profile: Profile) => {
    setSelectedUser(profile);
    setEditRole(profile.role);
    setEditDepartment(profile.department || '');
    setEditJobTitle(profile.jobTitle || '');
    setIsEditing(false);
    setShowDetailDialog(true);
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <div className="flex items-center gap-2"><UserX className="h-4 w-4 text-red-500" /><span className="text-sm text-muted-foreground">Inactive</span></div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.inactive}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-amber-500" /><span className="text-sm text-muted-foreground">Admins/QM</span></div>
            <span className="text-2xl font-bold text-amber-600">{summaryCounts.admins}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users by name, email, department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* User Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[220px]">Email</TableHead>
                  <TableHead className="w-[160px]">Role</TableHead>
                  <TableHead className="w-[140px]">Department</TableHead>
                  <TableHead className="w-[150px]">Job Title</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Created Date</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(profile => {
                  const memberStatus = getMemberStatus(profile.id);
                  return (
                    <TableRow key={profile.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(profile)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {profile.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                          </div>
                          <span className="font-medium">{profile.fullName || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{profile.email}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', roleColors[profile.role])} variant="secondary">
                          {roleLabels[profile.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{profile.department || '-'}</TableCell>
                      <TableCell className="text-sm">{profile.jobTitle || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', memberStatus === 'active' ? 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400' : 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400')}>
                          {memberStatus === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(profile.createdAt)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(profile); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="grid gap-2">
                <Label>Email *</Label>
                <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="email@company.com" />
              </div>
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
              <div className="grid gap-2">
                <Label>Department</Label>
                <Input value={addDepartment} onChange={(e) => setAddDepartment(e.target.value)} placeholder="Department" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Job Title</Label>
              <Input value={addJobTitle} onChange={(e) => setAddJobTitle(e.target.value)} placeholder="Job title" />
            </div>

            {/* Permissions Preview */}
            {addRole && (
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Permissions for {roleLabels[addRole]}:</p>
                <PermissionSummary role={addRole} />
              </div>
            )}

            <Button className="w-full" onClick={handleAddUser} disabled={!addName || !addEmail}>Add User</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {selectedUser.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                  </div>
                  <div>
                    <p>{selectedUser.fullName || 'Unknown'}</p>
                    <p className="text-sm font-normal text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status & Role Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(roleColors[selectedUser.role])} variant="secondary">{roleLabels[selectedUser.role]}</Badge>
                  <Badge variant="outline" className={cn(
                    getMemberStatus(selectedUser.id) === 'active'
                      ? 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400'
                      : 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400'
                  )}>
                    {getMemberStatus(selectedUser.id) === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Profile Info */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Profile Information</h4>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Role</Label>
                          <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Department</Label>
                          <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} placeholder="Department" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Job Title</Label>
                        <Input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} placeholder="Job title" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveProfile} disabled={!hasPermission('admin.users')}>Save Changes</Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Department:</span> <span className="font-medium ml-1">{selectedUser.department || '-'}</span></div>
                      <div><span className="text-muted-foreground">Job Title:</span> <span className="font-medium ml-1">{selectedUser.jobTitle || '-'}</span></div>
                      <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium ml-1">{selectedUser.phone || '-'}</span></div>
                      <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{formatDate(selectedUser.createdAt)}</span></div>
                      <div><span className="text-muted-foreground">Last Updated:</span> <span className="font-medium ml-1">{formatDate(selectedUser.updatedAt)}</span></div>
                      {hasPermission('admin.users') && (
                        <div className="col-span-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditRole(selectedUser.role);
                            setEditDepartment(selectedUser.department || '');
                            setEditJobTitle(selectedUser.jobTitle || '');
                            setIsEditing(true);
                          }}>
                            <Edit className="h-3 w-3 mr-1" />Edit Profile
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Role Permissions Summary */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Role Permissions — {roleLabels[isEditing ? editRole : selectedUser.role]}
                  </h4>
                  <PermissionSummary role={isEditing ? editRole : selectedUser.role} />
                  <div className="text-xs text-muted-foreground">
                    {rolePermissions[isEditing ? editRole : selectedUser.role].length} permissions granted
                  </div>
                </div>
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
