'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit, Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const InfoTooltip = ({ children, content }: { children: React.ReactNode; content: string | React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="relative inline-block">
      <div
        className="cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-10 w-max max-w-xs p-2 text-sm text-white bg-black rounded-md shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
};

const defaultRoles = ['Admin', 'Manager', 'Agent'];

export default function UsersPermissionsPanel() {
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Manager' },
    { id: '3', name: 'Bob Lee', email: 'bob@example.com', role: 'Agent' },
  ]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: defaultRoles[0] });

  // CRUD logic
  const addUser = () => {
    if (newUser.name && newUser.email) {
      setUsers(prev => [...prev, { id: Date.now().toString(), ...newUser }]);
      setNewUser({ name: '', email: '', role: defaultRoles[0] });
      setIsAddModalOpen(false);
    }
  };
  const startEdit = (user: User) => {
    setEditingUser(user);
    setNewUser({ name: user.name, email: user.email, role: user.role });
    setIsEditModalOpen(true);
  };
  const editUser = () => {
    if (editingUser && newUser.name && newUser.email) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...editingUser, ...newUser } : u));
      setEditingUser(null);
      setNewUser({ name: '', email: '', role: defaultRoles[0] });
      setIsEditModalOpen(false);
    }
  };
  const cancelEdit = () => {
    setEditingUser(null);
    setNewUser({ name: '', email: '', role: defaultRoles[0] });
    setIsEditModalOpen(false);
  };
  const deleteSelectedUsers = () => {
    setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
    setSelectedUsers([]);
  };
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const toggleAllUsers = () => {
    setSelectedUsers(prev => prev.length === users.length ? [] : users.map(u => u.id));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Users & Permissions</h3>
            <InfoTooltip content="Manage users and their roles/permissions for the service desk.">
              <Info className="h-4 w-4 text-slate-400 cursor-help" />
            </InfoTooltip>
          </div>

          {/* Add User Modal */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <Input value={newUser.name} onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))} placeholder="Full name" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} placeholder="Email address" type="email" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <select value={newUser.role} onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))} className="border border-slate-300 rounded px-2 py-1 w-full">
                    {defaultRoles.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
