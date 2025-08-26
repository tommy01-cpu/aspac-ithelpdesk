import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    employee_id?: string;
    job_title?: string;
    profile_image?: string;
    roles?: string[];
    isTechnician?: boolean;
    isServiceApprover?: boolean;
    isAdmin?: boolean;
    requiresPasswordChange?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      suffix?: string | null;
      email?: string | null;
      image?: string | null;
      employee_id?: string;
      job_title?: string;
      profile_image?: string;
      roles?: string[];
      isTechnician?: boolean;
      isServiceApprover?: boolean;
      isAdmin?: boolean;
      requiresPasswordChange?: boolean;
    };
  }

  interface JWT {
    employee_id?: string;
    job_title?: string;
    profile_image?: string;
    roles?: string[];
    isTechnician?: boolean;
    isServiceApprover?: boolean;
    isAdmin?: boolean;
    requiresPasswordChange?: boolean;
  }
}