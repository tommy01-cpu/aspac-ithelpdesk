"use client";

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Users, Zap, KeyRound, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from "next/image";

import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [showForceChangePassword, setShowForceChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Get callback URL from query params
  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  // Check if user is already authenticated and redirect them
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const session = await getSession();
        if (session) {
          console.log('User already authenticated, redirecting to:', callbackUrl);
          // Don't show toast, just redirect silently for better UX
          router.push(callbackUrl);
          return; // Don't set isCheckingAuth to false if redirecting
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
      
      // Only show login form if user is not authenticated
      setIsCheckingAuth(false);
    };

    checkAuthAndRedirect();
  }, [callbackUrl, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signIn('credentials', {
        employee_id: employeeId,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid employee ID or password');
        toast({
          title: "Login Failed",
          description: "Invalid employee ID or password. Please try again.",
          variant: "destructive"
        });
      } else {
        // Get the session to verify login and check password change requirement
        const session = await getSession();
        if (session) {
          // Check if password change is required
          if (session.user.requiresPasswordChange) {
            setIsLoading(false);
            setShowForceChangePassword(true);
            toast({
              title: "Password Change Required",
              description: "Please create a new secure password to continue.",
              variant: "destructive"
            });
            return;
          }
          
          // Get user's name for personalized welcome message
          const userName = session.user.name || session.user.employee_id || 'User';
          
          toast({
            title: "Login Successful",
            description: `Welcome, ${userName}! `,
            className: "bg-yellow-50 border-yellow-200 text-yellow-800"
          });
          router.push(callbackUrl);
        }
      }
    } catch (error) {
      const errorMessage = 'An error occurred during login';
      setError(errorMessage);
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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

    if (newPassword.toLowerCase() === employeeId.toLowerCase()) {
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
          employee_id: employeeId,
          currentPassword: password,
          newPassword: newPassword,
          isForceChange: true
        }),
      });

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully. Please log in with your new password.",
        });
        setShowForceChangePassword(false);
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
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

  const handleCloseForceChangePassword = () => {
    setShowForceChangePassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setEmployeeId('');
    setPassword('');
    setError('');
  };

  const features = [
    {
      icon: Shield,
      title: 'Secure Access',
      description: 'Enterprise-grade security for all your requests'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work together with your IT support team'
    },
    {
      icon: Zap,
      title: 'Fast Resolution',
      description: 'Quick response times and efficient solutions'
    }
  ];

  return (
    <>
      {/* Show loading state while checking authentication */}
      {isCheckingAuth && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Checking authentication...</p>
          </div>
        </div>
      )}

      {/* Only show login form if not checking auth and user is not authenticated */}
      {!isCheckingAuth && (
        <>
          {/* Force Password Change Modal */}
          <Dialog open={showForceChangePassword} onOpenChange={handleCloseForceChangePassword}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-500" />
                Password Change Required
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseForceChangePassword}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Your password cannot be the same as your employee ID. Please create a new secure password.
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

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseForceChangePassword}
                disabled={isChangingPassword}
                className="flex-1"
              >
                Cancel
              </Button>
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

      <div 
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: "url('/login-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#6b7280'
        }}
      >
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40"></div>

        <div className="relative w-full max-w-md mx-auto">
          <Card className="bg-white shadow-2xl border-0 bg-opacity-30 rounded-3xl">
            <CardHeader className="text-center pb-6">
              {/* Logo and Title */}
              <div className="flex flex-col items-center justify-center mb-3">
                <Image
                  src="/aspac-logo.png"
                  alt="ASPAC Logo"
                  width={100}
                  height={100}
                  className="object-contain mb-3"
                />
                <h1 className="text-xl font-semibold font-neo-sans" style={{ fontSize: '35px' }}>IT Help Desk</h1>
              </div>
               <p className="text-sm font-bold ">Version 1.250828</p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Employee ID Field */}
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="employee_id"
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Username"
                    className="pl-10 h-12"
                    required
                  />



                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                {/* <div className="text-center">
                  <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                    Forgot Password?
                  </Link>
                </div> */}

                {/* Login Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    'Log in'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer Text */}
          <div className="mt-6 text-center text-white text-sm">


            <p className="mt-1">This website is best viewed with <strong style={{ color: '#1191ccff' }}><Link href="https://www.google.com/chrome/">Google Chrome</Link></strong></p>
          </div>
        </div>
      </div>
        </>
      )}
    </>
  );
}
