"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Building, Phone as PhoneIcon, Edit2, Shield, AtSign, Briefcase, IdCard, Mail as MailIcon, Building2, Calendar, CheckSquare, Users2, Plus, Filter, Download, MoreHorizontal } from 'lucide-react';
import { SessionWrapper } from '@/components/session-wrapper';
import StatusSwitch from '@/components/status-switch'; // Import the new StatusSwitch component

type HRISUser = {
  emp_code: string;
  emp_fname: string;
  emp_lname: string;
  emp_mid: string;
  emp_suffix: string;
  emp_status: string;
  branch_code: string;
  branch_name: string;
  emp_comp_num: string;
  emp_email: string;
  emp_telno: string;
  emp_cell: string;
  emp_bday: string;
  emp_comp_mail: string;
  emp_city_house_no: string;
  emp_city_bldng_name: string;
  emp_city_Street: string;
  emp_city_subd: string;
  emp_city_brngy: string;
  emp_city_city: string;
  emp_city_prov: string;
  emp_city_zip: string;
  dept_des: string;
  div_des: string;
  sect_des: string;
  post_des: string;
  comp_des: string;
  roles: string[]; // Added roles property
};

export default function UserManagementPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    phone: '',
    employeeId: '',
    roles: [] as string[],
    status: '',
    middleName: '',
    suffix: '',
    branch: '',
    birthday: '',
    division: '',
    section: '',
    position: '',
    cellphone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<HRISUser[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const [selectedUser, setSelectedUser] = useState<HRISUser | null>(null);

  // 2. Add state for modal and HRIS users
  const [showAddModal, setShowAddModal] = useState(false);
  const [hrisUsers, setHrisUsers] = useState<HRISUser[]>([]);
  const [isHrisLoading, setIsHrisLoading] = useState(false);
  // Add state for modal search
  const [modalSearch, setModalSearch] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate signup process
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to login or dashboard
      window.location.href = '/login';
    }, 2000);
  };

  useEffect(() => {
    // 1. Fetch users from your backend users table for the main list
    fetch('/api/users') // Adjust this endpoint to your actual backend route
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || []);
      })
      .catch(() => setUsers([]));
  }, []);

  

  // 3. Fetch HRIS users when modal opens
  useEffect(() => {
    if (showAddModal) {
      setIsHrisLoading(true);
      fetch('http://192.168.1.122:3000/user/get-all-hris-users/')
        .then(res => res.json())
        .then(data => {
          setHrisUsers(data.data || []);
          setIsHrisLoading(false);
        })
        .catch(() => {
          setHrisUsers([]);
          setIsHrisLoading(false);
        });
    }
  }, [showAddModal]);

  // Filtered and paginated users
  const filteredUsers = Array.isArray(users)
    ? users.filter((user: HRISUser) => {
        const omni = `
        ${user.emp_code} ${user.emp_fname} ${user.emp_lname} ${user.emp_mid} ${user.emp_suffix} ${user.emp_status}
        ${user.branch_name} ${user.emp_email} ${user.emp_cell} ${user.emp_bday}
        ${user.dept_des} ${user.div_des} ${user.sect_des} ${user.post_des}
      `.toLowerCase();
        return omni.includes(search.toLowerCase());
      })
    : [];
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // When a user is selected, fill the form fields
  useEffect(() => {
    if (selectedUser) {
      setFormData(prev => ({
        ...prev,
        employeeId: selectedUser.emp_code || '',
        firstName: selectedUser.emp_fname || '',
        middleName: selectedUser.emp_mid || '',
        lastName: selectedUser.emp_lname || '',
        suffix: selectedUser.emp_suffix || '',
        status: selectedUser.emp_status || '',
        branch: selectedUser.branch_name || '',
        email: selectedUser.emp_email || '',
        cellphone: selectedUser.emp_cell || '',
        birthday: selectedUser.emp_bday ? selectedUser.emp_bday.split('T')[0] : '',
        department: selectedUser.dept_des || '',
        division: selectedUser.div_des || '',
        section: selectedUser.sect_des || '',
        position: selectedUser.post_des || '',
        roles: selectedUser.roles || [], // Sync roles from user
      }));
    }
  }, [selectedUser]);

  // Show all HRIS users in modal, but mark those already in users list with a checked, disabled checkbox
  const filteredHrisUsers = Array.isArray(hrisUsers)
    ? hrisUsers.filter((user: HRISUser) => {
        const omni = `
        ${user.emp_code} ${user.emp_fname} ${user.emp_lname} ${user.emp_mid} ${user.emp_suffix} ${user.emp_status}
        ${user.branch_name} ${user.emp_email} ${user.emp_cell} ${user.emp_bday}
        ${user.dept_des} ${user.div_des} ${user.sect_des} ${user.post_des}
      `.replace(/\s+/g, ' ').toLowerCase();
        return omni.includes(modalSearch.trim().toLowerCase());
      })
    : [];

  return (

    <SessionWrapper> 
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
             
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-gray-600 mt-1">Manage users and their details efficiently</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-6">
            {/* User List Panel */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Employee Directory</h2>
                      <p className="text-blue-100 text-sm">{filteredUsers.length} employees found</p>
                    </div>
                  </div>
                  {/* Update Add Employee button to open modal */}
                  <Button 
                    size="sm" 
                    className="bg-white text-blue-600 hover:bg-blue-50 shadow-sm font-medium"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="relative mb-6">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search employees by name, ID, department..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="pl-10 h-11 bg-gray-50/50 border-gray-200 rounded-xl font-medium placeholder:text-gray-500 focus:bg-white focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-700 h-12">ID</TableHead>
                        <TableHead className="font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">Position</TableHead>
                        <TableHead className="font-semibold text-gray-700">Roles</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Users2 className="w-12 h-12 text-gray-300" />
                              <p className="text-gray-500 font-medium">No employees found</p>
                              <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedUsers.map((user: HRISUser) => (
                          <TableRow
                            key={user.emp_code}
                            className={`cursor-pointer transition-all duration-200 hover:bg-blue-50/50 border-b border-gray-100 ${
                              selectedUser?.emp_code === user.emp_code 
                                ? 'bg-blue-50 border-blue-200' 
                                : ''
                            }`}
                            onClick={() => setSelectedUser(user)}
                          >
                            <TableCell className="font-mono text-sm font-medium text-gray-900 py-4">
                              {user.emp_code}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {user.emp_fname.charAt(0)}{user.emp_lname.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{user.emp_fname} {user.emp_lname}</p>
                                  <p className="text-sm text-gray-500">{user.emp_email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-gray-900 py-4">{user.post_des}</TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-wrap gap-1">
                                {user.roles && user.roles.length > 0 ? user.roles.map(role => {
                                  let color = 'bg-gray-200 text-gray-700';
                                  if (role === 'admin') color = 'bg-red-100 text-red-700';
                                  else if (role === 'user') color = 'bg-blue-100 text-blue-700';
                                  else if (role === 'technician') color = 'bg-green-100 text-green-700';
                                  return (
                                    <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                                      {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </span>
                                  );
                                }) : (
                                  <span className="text-xs text-gray-400">No roles</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              {/* Status Switch */}
                              <StatusSwitch user={user} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 px-2">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, filteredUsers.length)}</span> of{' '}
                    <span className="font-medium">{filteredUsers.length}</span> employees
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 p-0 ${
                            currentPage === page 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* User Details Panel */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Edit2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Employee Details</h2>
                    <p className="text-purple-100 text-sm">
                      {selectedUser ? `${selectedUser.emp_fname} ${selectedUser.emp_lname}` : 'Select an employee to view details'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {!selectedUser ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <UserIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Employee Selected</h3>
                    <p className="text-gray-500 text-sm">Please select an employee from the list to view their details</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Employee ID */}
                      <div className="space-y-2">
                        <label htmlFor="employeeId" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <IdCard className="w-4 h-4 text-indigo-500" />
                          Employee ID
                        </label>
                        <Input 
                          id="employeeId" 
                          type="text" 
                          value={formData.employeeId || ''} 
                          readOnly 
                          className="bg-gray-50/50 border-gray-200 rounded-lg font-mono text-sm"
                        />
                      </div>

                      {/* Name Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="firstName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-indigo-500" />
                            First Name
                          </label>
                          <Input 
                            id="firstName" 
                            type="text" 
                            value={formData.firstName || ''} 
                            readOnly 
                            className="bg-gray-50/50 border-gray-200 rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="lastName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-indigo-500" />
                            Last Name
                          </label>
                          <Input 
                            id="lastName" 
                            type="text" 
                            value={formData.lastName || ''} 
                            readOnly 
                            className="bg-gray-50/50 border-gray-200 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MailIcon className="w-4 h-4 text-indigo-500" />
                          Email Address
                        </label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={formData.email || ''} 
                          readOnly 
                          className="bg-gray-50/50 border-gray-200 rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="cellphone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4 text-indigo-500" />
                          Phone Number
                        </label>
                        <Input 
                          id="cellphone" 
                          type="text" 
                          value={formData.cellphone || ''} 
                          readOnly 
                          className="bg-gray-50/50 border-gray-200 rounded-lg"
                        />
                      </div>

                      {/* Organization Details */}
                      <div className="space-y-2">
                        <label htmlFor="department" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-indigo-500" />
                          Department
                        </label>
                        <Input 
                          id="department" 
                          type="text" 
                          value={formData.department || ''} 
                          readOnly 
                          className="bg-gray-50/50 border-gray-200 rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="position" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-indigo-500" />
                          Position
                        </label>
                        <Input 
                          id="position" 
                          type="text" 
                          value={formData.position || ''} 
                          readOnly 
                          className="bg-gray-50/50 border-gray-200 rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="branch" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-500" />
                          Branch
                        </label>
                        <Input 
                          id="branch" 
                          type="text" 
                          value={formData.branch || ''} 
                          readOnly 
                          className="bg-gray-50/50 border-gray-200 rounded-lg"
                        />
                      </div>

                      {/* Role Assignment */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-indigo-500" />
                          Role Assignment
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                            <Checkbox 
                              id="role-admin" 
                              checked={formData.roles.includes('admin')} 
                              onCheckedChange={checked => {
                                setFormData(prev => {
                                  const roles = prev.roles.includes('admin')
                                    ? prev.roles.filter(r => r !== 'admin')
                                    : [...prev.roles, 'admin'];
                                  return { ...prev, roles };
                                });
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">Administrator</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                            <Checkbox 
                              id="role-user" 
                              checked={formData.roles.includes('user')} 
                              onCheckedChange={checked => {
                                setFormData(prev => {
                                  const roles = prev.roles.includes('user')
                                    ? prev.roles.filter(r => r !== 'user')
                                    : [...prev.roles, 'user'];
                                  return { ...prev, roles };
                                });
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">User</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                            <Checkbox 
                              id="role-technician" 
                              checked={formData.roles.includes('technician')} 
                              onCheckedChange={checked => {
                                setFormData(prev => {
                                  const roles = prev.roles.includes('technician')
                                    ? prev.roles.filter(r => r !== 'technician')
                                    : [...prev.roles, 'technician'];
                                  return { ...prev, roles };
                                });
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">Technician</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                      <Button 
                        type="submit" 
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium h-12 rounded-lg shadow-lg"
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium h-12 rounded-lg"
                        onClick={() => {
                          setFormData({
                            firstName: '',
                            lastName: '',
                            email: '',
                            password: '',
                            confirmPassword: '',
                            department: '',
                            phone: '',
                            employeeId: '',
                            roles: [],
                            status: '',
                            middleName: '',
                            suffix: '',
                            branch: '',
                            birthday: '',
                            division: '',
                            section: '',
                            position: '',
                            cellphone: '',
                          });
                          setSelectedUser(null);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Reset
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold mb-4">Add Employee from HRIS</h2>
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Search HRIS users by name, ID, department..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="h-10 bg-gray-50/50 border-gray-200 rounded-xl font-medium placeholder:text-gray-500 focus:bg-white focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                />
              </div>
              {isHrisLoading ? (
                <div className="text-center py-8 text-gray-500">Loading HRIS users...</div>
              ) : filteredHrisUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No HRIS users found.</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Department</th>
                        <th className="px-4 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHrisUsers.map(user => {
                        const alreadyExists = users.some(u => u.emp_code === user.emp_code);
                        return (
                          <tr key={user.emp_code} className="border-b">
                            <td className="px-4 py-2 font-mono">{user.emp_code}</td>
                            <td className="px-4 py-2">{user.emp_fname} {user.emp_lname}</td>
                            <td className="px-4 py-2">{user.dept_des}</td>
                            <td className="px-4 py-2">
                              {alreadyExists ? (
                                <span className="text-green-600 font-medium">Select</span>
                              ) : (
                                <Button size="sm" onClick={() => {
                                  setSelectedUser(user);
                                  setShowAddModal(false);
                                }}>Selected</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="max-w-7xl mx-auto mt-12 text-center">
          <p className="text-sm text-gray-500">
            © 2024 IT Help Desk. All rights reserved. • Built with modern design principles
          </p>
        </div>
      </div>
    </SessionWrapper>
  );
}