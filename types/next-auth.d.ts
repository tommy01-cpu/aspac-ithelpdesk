import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    employee_id?: string;
    job_title?: string;
    roles?: string[];
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
      roles?: string[];
    };
  }

  interface JWT {
    employee_id?: string;
    job_title?: string;
    roles?: string[];
  }
}