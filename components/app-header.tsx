"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
import { Search, Bell, Settings, User, LogOut, KeyRound, ChevronDown, Clock, FileText, Menu, X } from "lucide-react";
import { cn } from "../lib/utils";
import NotificationDropdown from "@/components/NotificationDropdown";
import { useNotificationPanel } from "@/contexts/notification-context";

export default function AppHeader() {
  const { data: session } = useSession();
  const { openNotificationPanel } = useNotificationPanel();
  const [imgError, setImgError] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const pathname = usePathname();

  // Function to navigate to first approval
  const navigateToFirstApproval = async () => {
    try {
      const response = await fetch('/api/approvals/pending');
      if (response.ok) {
        const data = await response.json();
        if (data.approvals && data.approvals.length > 0) {
          const firstApproval = data.approvals[0];
          const requestId = firstApproval.requestId;
          window.location.href = `/requests/approvals/${requestId}`;
        } else {
          // Fallback to general approvals page if no pending approvals
          window.location.href = '/requests/approvals';
        }
      } else {
        // Fallback to general approvals page on error
        window.location.href = '/requests/approvals';
      }
    } catch (error) {
      console.error('Error fetching first approval:', error);
      // Fallback to general approvals page on error
      window.location.href = '/requests/approvals';
    }
  };

  // Fetch pending approvals count
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      if (!session?.user) return;
      
      try {
        const response = await fetch('/api/approvals/pending');
        if (response.ok) {
          const data = await response.json();
          setPendingApprovalsCount(data.approvals?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
        setPendingApprovalsCount(0);
      }
    };

    fetchPendingApprovals();
    
    // Refresh every 30 seconds to keep count updated
    const interval = setInterval(fetchPendingApprovals, 30000);
    
    return () => clearInterval(interval);
  }, [session]);

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
    <header className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: '#7d6b3f', borderBottom: '1px solid rgba(109, 91, 43, 0.5)' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <img 
                src="/aspac-logo.png"
                  alt="ASPAC Logo"
                className="w-12 h-12 object-contain mr-3"
              />
              <div>
                <h1 className="text-base sm:text-lg font-semibold text-white">IT Help Desk</h1>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <div className="flex items-center space-x-6">
                <Link href="/">
                <Button 
                  variant="ghost" 
                  className={cn(
                    "text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                    pathname === "/" ? "bg-black/20 text-white hover:text-amber-900" : "hover:text-white hover:bg-black/10"
                  )}
                >
                  Home
                </Button>
              </Link>
              
              <Link href="/requests/view">
                <Button 
                  variant="ghost" 
                  className={cn(
                    "text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                    pathname?.startsWith("/requests") && !pathname?.startsWith("/requests/approvals") ? "bg-black/20 text-white hover:text-amber-900" : "hover:text-white hover:bg-black/10"
                  )}
                >
                  Requests
                </Button>
              </Link>

              {/* Approvals tab - only show if there are pending approvals */}
              {pendingApprovalsCount > 0 && (
                <Button 
                  variant="ghost" 
                  className={cn(
                    "text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                    pathname?.startsWith("/requests/approvals") ? "bg-black/20 text-white hover:text-amber-900" : "hover:text-white hover:bg-black/10"
                  )}
                  onClick={navigateToFirstApproval}
                >
                  Approvals
                </Button>
              )}
              
              {/* Only show Reports if user is admin, technician, or has elevated privileges */}
              {(session?.user?.isAdmin || session?.user?.isTechnician || session?.user?.isServiceApprover) && (
                <Link href="/reports">
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                      pathname?.startsWith("/reports") ? "bg-black/20 text-white hover:text-amber-900" : "hover:text-white hover:bg-black/10"
                    )}
                  >
                    Reports
                  </Button>
                </Link>
              )}
              
              {/* Only show Technician View if user is a technician */}
              {session?.user?.isTechnician && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "text-white font-medium flex items-center gap-1 px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                        pathname?.startsWith("/technician") ? "bg-black/20 text-white hover:text-amber-900" : "hover:text-white hover:bg-black/10"
                      )}
                    >
                      Technician View
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" style={{ backgroundColor: '#7d6b3f', borderColor: 'rgba(109, 91, 43, 0.8)' }}>
                    <DropdownMenuItem asChild>
                      <Link href="/technician/dashboard" className="w-full text-white hover:text-white hover:bg-black/20">
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/technician/requests" className="w-full text-white hover:text-white hover:bg-black/20">
                        Requests
                      </Link>
                    </DropdownMenuItem>
                    {/* <DropdownMenuItem asChild>
                      <Link href="/technician/reports" className="w-full text-white hover:text-white hover:bg-black/20">
                        Reports
                      </Link>
                    </DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Only show Admin View if user is an admin */}
              {session?.user?.isAdmin && (
                <Link href="/admin/settings">
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                      pathname?.startsWith("/admin") ? "bg-black/20 text-white hover:text-amber-900" : "hover:text-white hover:bg-black/10"
                    )}
                  >
                    Admin View
                  </Button>
                </Link>
              )}
            
            </div>
          </nav>

          {/* Mobile Menu Button and Right Side Icons */}
          <div className="flex items-center space-x-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:text-white hover:bg-black/10 transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Desktop right side icons */}
            <div className="hidden md:flex items-center space-x-3">
              <NotificationDropdown 
                className="text-white hover:text-white hover:bg-black/10 transition-all duration-200" 
                onViewAllClick={openNotificationPanel}
              />
              {/* Only show Settings icon if user is an admin */}
              {session?.user?.isAdmin && (
                <Link href="/admin/settings">
                  <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-black/10 transition-all duration-200">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-white hover:text-white hover:bg-black/10 transition-all duration-200 px-3 py-2 rounded-sm">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-amber-600 flex items-center justify-center">
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
                    <span className="hidden lg:block font-medium text-sm">
                      {session?.user?.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" style={{ backgroundColor: '#7d6b3f', borderColor: 'rgba(109, 91, 43, 0.8)' }}>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-white">
                        {session?.user?.name}
                        {session?.user?.suffix}
                      </p>
                      <p className="text-xs text-white/70">
                        {session?.user?.employee_id}
                      </p>
                      <p className="text-xs text-white/70">
                        {session?.user?.job_title}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator style={{ backgroundColor: 'rgba(109, 91, 43, 0.5)' }} />
                  <DropdownMenuItem 
                    onClick={() => {
                      window.open('/IT%20Helpdesk%20System%20Quick%20Reference%20Guide.pdf', '_blank');
                    }}
                    className="text-white hover:text-white hover:bg-black/20"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Reference Guide</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      resetPasswordModal();
                      setIsChangePasswordOpen(true);
                    }}
                    className="text-white hover:text-white hover:bg-black/20"
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>Change Password</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-white hover:text-white hover:bg-black/20">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile right side icons */}
            <div className="md:hidden flex items-center space-x-2">
              <NotificationDropdown 
                className="text-white hover:text-white hover:bg-black/10 transition-all duration-200" 
                onViewAllClick={openNotificationPanel}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-black/10 transition-all duration-200">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-amber-600 flex items-center justify-center">
                      {session?.user?.profile_image && !imgError ? (
                        <img
                          src={`/uploads/${session.user.profile_image}`}
                          alt="Profile Photo"
                          className="w-full h-full object-cover"
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <User className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" style={{ backgroundColor: '#7d6b3f', borderColor: 'rgba(109, 91, 43, 0.8)' }}>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-white">
                        {session?.user?.name}
                        {session?.user?.suffix}
                      </p>
                      <p className="text-xs text-white/70">
                        {session?.user?.employee_id}
                      </p>
                      <p className="text-xs text-white/70">
                        {session?.user?.job_title}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator style={{ backgroundColor: 'rgba(109, 91, 43, 0.5)' }} />
                  {session?.user?.isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/settings" className="w-full text-white hover:text-white hover:bg-black/20">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Admin Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator style={{ backgroundColor: 'rgba(109, 91, 43, 0.5)' }} />
                    </>
                  )}
                  <DropdownMenuItem 
                    onClick={() => {
                      window.open('/IT%20Helpdesk%20System%20Quick%20Reference%20Guide.pdf', '_blank');
                    }}
                    className="text-white hover:text-white hover:bg-black/20"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Reference Guide</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      resetPasswordModal();
                      setIsChangePasswordOpen(true);
                    }}
                    className="text-white hover:text-white hover:bg-black/20"
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>Change Password</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-white hover:text-white hover:bg-black/20">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-black/20">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                    pathname === "/" ? "bg-black/20 text-white hover:text-amber-900" : "hover:text-white hover:bg-black/10"
                  )}
                >
                  Home
                </Button>
              </Link>
              
              <Link href="/requests/view" onClick={() => setIsMobileMenuOpen(false)}>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                    pathname?.startsWith("/requests") && !pathname?.startsWith("/requests/approvals") ? "bg-black/20 text-white hover:text-amber-900" : "hover:text-white hover:bg-black/10"
                  )}
                >
                  Requests
                </Button>
              </Link>

              {/* Approvals tab - only show if there are pending approvals */}
              {pendingApprovalsCount > 0 && (
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start text-white hover:text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                    pathname?.startsWith("/requests/approvals") ? "bg-black/20 text-white" : "hover:bg-black/10"
                  )}
                  onClick={() => {
                    navigateToFirstApproval();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Approvals
                  {pendingApprovalsCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </Button>
              )}
              
              {/* Only show Technician View if user is a technician */}
              {session?.user?.isTechnician && (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-white text-sm font-medium border-b border-black/20">
                    Technician View
                  </div>
                  <Link href="/technician/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "w-full justify-start text-white hover:text-white font-medium px-6 py-2 rounded-sm transition-all duration-200 text-sm",
                        pathname === "/technician/dashboard" ? "bg-black/20 text-white" : "hover:bg-black/10"
                      )}
                    >
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/technician/requests" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "w-full justify-start text-white hover:text-white font-medium px-6 py-2 rounded-sm transition-all duration-200 text-sm",
                        pathname === "/technician/requests" ? "bg-black/20 text-white" : "hover:bg-black/10"
                      )}
                    >
                      Requests
                    </Button>
                  </Link>
                </div>
              )}
              
              {/* Only show Admin View if user is an admin */}
              {session?.user?.isAdmin && (
                <Link href="/admin/settings" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start text-white hover:text-white font-medium px-3 py-2 rounded-sm transition-all duration-200 text-sm",
                      pathname?.startsWith("/admin") ? "bg-black/20 text-white" : "hover:bg-black/10"
                    )}
                  >
                    Admin View
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
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
