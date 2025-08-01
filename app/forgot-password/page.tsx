"use client";

import { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft, CheckCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate email sending process
    setTimeout(() => {
      setIsLoading(false);
      setIsEmailSent(true);
    }, 2000);
  };

  const handleResendEmail = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto">
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-2xl">
          <CardHeader className="text-center pb-8">
            {/* Logo */}
            <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center mr-4 shadow-2xl p-2">
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
            
            {!isEmailSent ? (
              <>
                <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
                  Forgot your password?
                </CardTitle>
                <p className="text-slate-600">
                  No worries! Enter your email address and we'll send you a reset link.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
                  Check your email
                </CardTitle>
                <p className="text-slate-600">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </>
            )}
          </CardHeader>

          <CardContent>
            {!isEmailSent ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="pl-10 h-12 bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Send Reset Link Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Send reset link</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  )}
                </Button>

                {/* Back to Login */}
                <div className="text-center">
                  <Link 
                    href="/login" 
                    className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 font-medium transition-colors group"
                  >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
                    <span>Back to sign in</span>
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900">What's next?</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Check your email inbox (and spam folder)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Click the reset link in the email</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Create a new password</span>
                    </li>
                  </ul>
                </div>

                {/* Resend Email */}
                <div className="text-center space-y-4">
                  <p className="text-sm text-slate-600">
                    Didn't receive the email?
                  </p>
                  <Button
                    onClick={handleResendEmail}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full h-12 border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
                        <span>Resending...</span>
                      </div>
                    ) : (
                      'Resend email'
                    )}
                  </Button>
                </div>

                {/* Back to Login */}
                <div className="text-center">
                  <Link 
                    href="/login" 
                    className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 font-medium transition-colors group"
                  >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
                    <span>Back to sign in</span>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>© 2024 IT Help Desk. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}