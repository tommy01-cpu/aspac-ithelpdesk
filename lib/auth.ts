import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        employee_id: { label: 'Employee ID', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.employee_id || !credentials?.password) {
          return null;
        }

        try {
          console.log('🔍 Attempting to authenticate user with employee_id:', credentials.employee_id);
          
          const user = await prisma.users.findFirst({
            where: {
              emp_code: credentials.employee_id, // use Prisma model property
              emp_status: 'active',              // use Prisma model property
            },
            include: {
              user_roles: {
                include: {
                  roles: true
                }
              }
            }
          });

          console.log('👤 User found:', user ? 'Yes' : 'No');
          if (user) {
            console.log('👤 User details:', {
              id: user.id,
              emp_code: user.emp_code,
              emp_fname: user.emp_fname,
              emp_status: user.emp_status,
              hasPassword: !!user.password,
              passwordLength: user.password?.length
            });
          }

          if (!user) {
            console.log('❌ User not found or inactive');
            return null;
          }

          console.log('🔐 Comparing passwords...');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          console.log('🔐 Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return null;
          }

          console.log('✅ Authentication successful');
          return {
            id: user.id.toString(),
            name: `${user.emp_fname} ${user.emp_lname} ${user.emp_suffix ?? ''}`.trim(),
            email: user.emp_email ?? undefined,
            employee_id: user.emp_code ?? undefined,
            job_title: user.post_des ?? undefined,
            roles: user.user_roles.map(ur => ur.roles.name)
          };
        } catch (error) {
          console.error('🚨 Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.employee_id = user.employee_id;
        token.job_title = user.job_title;
        token.roles = user.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub ?? '';
        session.user.employee_id = token.employee_id as string | undefined;
        session.user.job_title = token.job_title as string | undefined;
        session.user.roles = token.roles as string[] | undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  }
};