"use client";

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { signOut } from 'next-auth/react';

export function PasswordChangeChecker({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (session?.user?.requiresPasswordChange) {
      setShowPasswordChange(true);
    }
  }, [session]);

  // Password validation function
  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    };
  };

  const isPasswordValid = (password: string) => {
    const validation = validatePassword(password);
    return validation.length && validation.uppercase && validation.lowercase && validation.numbers && validation.special;
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (!isPasswordValid(newPassword)) {
      toast({
        title: "Error",
        description: "Password does not meet the required criteria.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.toLowerCase() === session?.user?.employee_id?.toLowerCase()) {
      toast({
        title: "Error",
        description: "Your new password cannot be the same as your employee ID.",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);
    
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: session?.user?.employee_id,
          newPassword: newPassword,
          isForceChange: true
        }),
      });

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully. Please log in again.",
        });
        setShowPasswordChange(false);
        setNewPassword('');
        setConfirmPassword('');
        // Sign out user to force re-login with new session
        await signOut({ redirect: false });
        // Manually redirect to clean login URL
        window.location.href = '/login';
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to change password.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while changing your password.",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      {children}
      
      {/* Force Password Change Modal */}
      <Dialog open={showPasswordChange} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Password Change Required
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              For security reasons, you must change your password before continuing.
            </p>
            
            {/* New Password Field */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-slate-400"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`pl-10 pr-10 ${
                    confirmPassword && newPassword && confirmPassword !== newPassword 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                      : confirmPassword && newPassword && confirmPassword === newPassword
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                      : ''
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-slate-400"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Password Requirements:</p>
                <div className="space-y-1 text-sm">
                  {Object.entries(validatePassword(newPassword)).map(([key, isValid]) => (
                    <div key={key} className={`flex items-center gap-2 ${isValid ? 'text-green-600' : 'text-red-500'}`}>
                      <span className="text-xs">{isValid ? '✓' : '✗'}</span>
                      <span>
                        {key === 'length' && 'At least 8 characters'}
                        {key === 'uppercase' && 'Contains uppercase letter'}
                        {key === 'lowercase' && 'Contains lowercase letter'}
                        {key === 'numbers' && 'Contains numbers'}
                        {key === 'special' && 'Contains special character'}
                      </span>
                    </div>
                  ))}
                  
                  {/* Password Match Validation */}
                  {confirmPassword && (
                    <div className={`flex items-center gap-2 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                      <span className="text-xs">{newPassword === confirmPassword ? '✓' : '✗'}</span>
                      <span>Passwords match</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !isPasswordValid(newPassword) || newPassword !== confirmPassword}
                className="flex-1"
              >
                {isChangingPassword ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Changing Password...</span>
                  </div>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
