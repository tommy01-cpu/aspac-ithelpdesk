"use client";

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

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
        // Get the session to verify login
        const session = await getSession();
        if (session) {
          toast({
            title: "Login Successful",
            description: "Welcome back! Redirecting to dashboard...",
          });
          router.push('/');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:block space-y-8">
          {/* Logo & Title */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
            <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center mr-4 shadow-2xl p-2">
                <img 
                  src="http://hris.aspacphils.com.ph/HRIS-Plus-Version-2.0/contents/images/aspac-white.png" 
                  alt="ASPAC Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">IT Help Desk</h1>
                <p className="text-slate-600">Support Portal</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Welcome back to your
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> workspace</span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              Access your personalized dashboard, track support requests, and get the help you need.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-2xl">
            <CardHeader className="text-center pb-8">
              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-3 p-2">
                  <img 
                    src="http://hris.aspacphils.com.ph/HRIS-Plus-Version-2.0/contents/images/aspac-white.png" 
                    alt="ASPAC Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">IT Help Desk</h1>
                </div>
              </div>
              
              <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
                Sign in to your account
              </CardTitle>
              {/* <p className="text-slate-600">
                Enter your employee ID and password to access your dashboard
              </p> */}
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Employee ID Field */}
                <div className="space-y-2">
                  <label htmlFor="employee_id" className="text-sm font-medium text-slate-700">
                    Employee ID
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="employee_id"
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Enter your employee ID"
                      className="pl-10 h-12 bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-12 bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={checked => setRememberMe(checked === true)}
                      className="border-slate-300"
                    />
                    <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                      Remember me
                    </label> */}
                  </div>
                  <Link href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                    Forgot password?
                  </Link>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign in</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center">
                <p className="text-slate-600">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                    Contact your administrator
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>© 2025 ASPAC International Inc. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}