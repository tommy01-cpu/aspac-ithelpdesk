'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit, Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
        <div className="absolute z-10 w-max max-w-xs p-2 text-sm text-white bg-black rounded-md shadow-lg -top-12 left-1/2 transform -translate-x-1/2">
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

          {/* Actions */}
          <div className="flex justify-between items-center mb-4">
            <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
            {selectedUsers.length > 0 && (
              <Button onClick={deleteSelectedUsers} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedUsers.length})
              </Button>
            )}
          </div>

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={toggleAllUsers}
                      className="rounded"
                    />
                  </th>
                  <th className="p-3 text-left font-medium text-slate-700">Name</th>
                  <th className="p-3 text-left font-medium text-slate-700">Email</th>
                  <th className="p-3 text-left font-medium text-slate-700">Role</th>
                  <th className="p-3 text-left font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-slate-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3 font-medium">{user.name}</td>
                    <td className="p-3 text-slate-600">{user.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button
                        onClick={() => startEdit(user)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <Input 
                    value={newUser.name} 
                    onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))} 
                    placeholder="Full name" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input 
                    value={newUser.email} 
                    onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} 
                    placeholder="Email address" 
                    type="email" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <select 
                    value={newUser.role} 
                    onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))} 
                    className="border border-slate-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {defaultRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addUser}>
                    Add User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit User Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <Input 
                    value={newUser.name} 
                    onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))} 
                    placeholder="Full name" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input 
                    value={newUser.email} 
                    onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} 
                    placeholder="Email address" 
                    type="email" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <select 
                    value={newUser.role} 
                    onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))} 
                    className="border border-slate-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {defaultRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={editUser}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
