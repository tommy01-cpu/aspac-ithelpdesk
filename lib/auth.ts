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
              },
              technician: true // Include technician data
            }
          });

          console.log('� User found:', user ? 'Yes' : 'No');
          if (user) {
            console.log('👤 User details:', {
              id: user.id,
              emp_code: user.emp_code,
              emp_fname: user.emp_fname,
              emp_status: user.emp_status,
              hasPassword: !!user.password,
              passwordLength: user.password?.length,
              hasTechnicianRecord: !!user.technician,
              technicianId: user.technician?.id
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
          
          // Check if password equals employee ID (first time login or admin reset)
          const passwordEqualsEmployeeId = await bcrypt.compare(credentials.employee_id, user.password);
          
          // Check if user is a technician by looking up in technician table
          const isTechnician = !!user.technician;
          const isAdmin = user.technician?.isAdmin ?? false;
          
          console.log('🔍 Technician status check:', {
            userId: user.id,
            hasTechnicianRecord: !!user.technician,
            technicianId: user.technician?.id || null,
            isTechnician: isTechnician,
            isAdmin: isAdmin,
            requiresPasswordChange: user.requiresPasswordChange || passwordEqualsEmployeeId
          });
          
          return {
            id: user.id.toString(),
            name: `${user.emp_fname} ${user.emp_lname} ${user.emp_suffix ?? ''}`.trim(),
            email: user.emp_email ?? undefined,
            employee_id: user.emp_code ?? undefined,
            job_title: user.post_des ?? undefined,
            profile_image: user.profile_image ?? undefined,
            roles: user.user_roles.map((ur: any) => ur.roles.name),
            isTechnician: isTechnician, // Based on technician table lookup
            isServiceApprover: user.isServiceApprover,
            isAdmin: isAdmin, // Get admin status from technician record
            requiresPasswordChange: user.requiresPasswordChange || passwordEqualsEmployeeId
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
        token.profile_image = user.profile_image;
        token.roles = user.roles;
        token.isTechnician = user.isTechnician;
        token.isServiceApprover = user.isServiceApprover;
        token.isAdmin = user.isAdmin;
        token.requiresPasswordChange = user.requiresPasswordChange;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub ?? '';
        session.user.employee_id = token.employee_id as string | undefined;
        session.user.job_title = token.job_title as string | undefined;
        session.user.profile_image = token.profile_image as string | undefined;
        session.user.roles = token.roles as string[] | undefined;
        session.user.isTechnician = token.isTechnician as boolean | undefined;
        session.user.isServiceApprover = token.isServiceApprover as boolean | undefined;
        session.user.isAdmin = token.isAdmin as boolean | undefined;
        session.user.requiresPasswordChange = token.requiresPasswordChange as boolean | undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  }
};