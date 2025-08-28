"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Bell, Settings, User, LogOut, KeyRound, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function AppHeader() {
  const { data: session } = useSession();
  const [imgError, setImgError] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pathname = usePathname();

  // Password validation helper
  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
    };
    return checks;
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const handlePasswordChange = async () => {
    setError('');
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Enhanced password validation
    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(passwordData.newPassword)) {
      setError('New password must contain at least one uppercase letter');
      return;
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(passwordData.newPassword)) {
      setError('New password must contain at least one lowercase letter');
      return;
    }

    // Check for numbers
    if (!/[0-9]/.test(passwordData.newPassword)) {
      setError('New password must contain at least one number');
      return;
    }

    // Check for special characters or symbols
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(passwordData.newPassword)) {
      setError('New password must contain at least one special character or symbol');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setIsChangePasswordOpen(false);
        alert('Password changed successfully!');
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordModal = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
  };

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-10 h-10 bg-gray-600 rounded-xl flex items-center justify-center mr-3 p-2">
                <img 
                  src="http://hris.aspacphils.com.ph/HRIS-Plus-Version-2.0/contents/images/aspac-white.png" 
                  alt="ASPAC Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">IT Help Desk</h1>
                <p className="text-xs text-gray-600">Support Portal</p>
              </div>
            </div>
          </div>
          <nav className="hidden md:block">
            <div className="flex items-center space-x-1">
                <Link href="/">
                <Button variant="ghost" className="text-gray-700 hover:text-blue-700 hover:bg-blue-50 font-medium">
                  Home
                </Button>
              </Link>
              
              <Link href="/requests/view">
                <Button variant="ghost" className="text-gray-700 hover:text-blue-700 hover:bg-blue-50 font-medium">
                  Requests
                </Button>
              </Link>
              
              <Link href="/reports">
                <Button variant="ghost" className="text-gray-700 hover:text-blue-700 hover:bg-blue-50 font-medium">
                  Reports
                </Button>
              </Link>
              
              {/* Only show Technician View if user is a technician */}
              {session?.user?.isTechnician && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-gray-700 hover:text-blue-700 hover:bg-blue-50 font-medium flex items-center gap-1">
                      Technician View
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link href="/technician/dashboard" className="w-full">
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/technician/requests?assignedToCurrentUser=true&viewMode=assigned_to_me&status=open,on_hold" className="w-full">
                        All Requests
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/technician/reports" className="w-full">
                        Reports
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Only show Admin View if user is an admin */}
              {session?.user?.isAdmin && (
                <Link href="/admin/settings">
                  <Button variant="ghost" className="text-gray-700 hover:text-blue-700 hover:bg-blue-50 font-medium">
                    Admin View
                  </Button>
                </Link>
              )}
            
            </div>
          </nav>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-blue-700 hover:bg-blue-50">
              <Search className="h-5 w-5" />
            </Button>
            <NotificationDropdown className="text-gray-600 hover:text-blue-700 hover:bg-blue-50" />
            {/* Only show Settings icon if user is an admin */}
            {session?.user?.isAdmin && (
              <Link href="/admin/settings">
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-blue-700 hover:bg-blue-50">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-blue-700 hover:bg-blue-50">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-blue-200/50">
                    {session?.user?.profile_image && !imgError ? (
                      <img
                        src={`/uploads/${session.user.profile_image}`}
                        alt="Profile Photo"
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className="hidden md:block font-medium">
                    {session?.user?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {session?.user?.name}
                      {session?.user?.suffix}
                    </p>
                    <p className="text-xs text-slate-500">
                      {session?.user?.employee_id}
                    </p>
                    <p className="text-xs text-slate-500">
                      {session?.user?.job_title}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  resetPasswordModal();
                  setIsChangePasswordOpen(true);
                }}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                disabled={loading}
              />
              <div className="text-xs space-y-1">
                <p className="font-medium text-gray-700">Password requirements:</p>
                {passwordData.newPassword && (
                  <ul className="space-y-0.5">
                    <li className={`flex items-center gap-1 ${validatePassword(passwordData.newPassword).length ? 'text-green-600' : 'text-red-500'}`}>
                      <span className="text-xs">{validatePassword(passwordData.newPassword).length ? '✓' : '✗'}</span>
                      Minimum 8 characters long
                    </li>
                    <li className={`flex items-center gap-1 ${validatePassword(passwordData.newPassword).uppercase ? 'text-green-600' : 'text-red-500'}`}>
                      <span className="text-xs">{validatePassword(passwordData.newPassword).uppercase ? '✓' : '✗'}</span>
                      Must contain uppercase letters
                    </li>
                    <li className={`flex items-center gap-1 ${validatePassword(passwordData.newPassword).lowercase ? 'text-green-600' : 'text-red-500'}`}>
                      <span className="text-xs">{validatePassword(passwordData.newPassword).lowercase ? '✓' : '✗'}</span>
                      Must contain lowercase letters
                    </li>
                    <li className={`flex items-center gap-1 ${validatePassword(passwordData.newPassword).numbers ? 'text-green-600' : 'text-red-500'}`}>
                      <span className="text-xs">{validatePassword(passwordData.newPassword).numbers ? '✓' : '✗'}</span>
                      Must contain numbers
                    </li>
                    <li className={`flex items-center gap-1 ${validatePassword(passwordData.newPassword).special ? 'text-green-600' : 'text-red-500'}`}>
                      <span className="text-xs">{validatePassword(passwordData.newPassword).special ? '✓' : '✗'}</span>
                      Must contain special characters or symbols
                    </li>
                  </ul>
                )}
                {!passwordData.newPassword && (
                  <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                    <li>Minimum 8 characters long</li>
                    <li>Must contain uppercase and lowercase letters</li>
                    <li>Must contain numbers</li>
                    <li>Must contain special characters or symbols</li>
                  </ul>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                disabled={loading}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
