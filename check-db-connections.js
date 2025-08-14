const { PrismaClient } = require('@prisma/client');

async function checkConnections() {
  const prisma = new PrismaClient();
  
  try {
    // Check current database connections
    const connections = await prisma.$queryRaw`
      SELECT 
        pid,
        usename,
        application_name,
        client_addr,
        backend_start,
        state,
        query
      FROM pg_stat_activity 
      WHERE datname = current_database()
      AND state = 'active'
      ORDER BY backend_start DESC;
    `;
    
    console.log('Current active database connections:');
    console.log(connections);
    
    const totalConnections = await prisma.$queryRaw`
      SELECT count(*) as total 
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `;
    
    console.log('Total connections to current database:', totalConnections);
    
    // Check max_connections setting
    const maxConnections = await prisma.$queryRaw`
      SHOW max_connections;
    `;
    
    console.log('Database max_connections setting:', maxConnections);
    
  } catch (error) {
    console.error('Error checking connections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConnections();
