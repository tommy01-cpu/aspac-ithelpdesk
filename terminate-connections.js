const { Client } = require('pg');

async function terminateConnections() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database successfully');
    
    // First, check current connections
    const connectionsQuery = `
      SELECT 
        pid,
        usename,
        application_name,
        client_addr,
        backend_start,
        state,
        state_change,
        query_start,
        substr(query, 1, 50) as query_snippet
      FROM pg_stat_activity 
      WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      ORDER BY backend_start DESC;
    `;
    
    const connections = await client.query(connectionsQuery);
    console.log('Current connections:', connections.rows.length);
    console.log('Connection details:');
    connections.rows.forEach((row, index) => {
      console.log(`${index + 1}. PID: ${row.pid}, User: ${row.usename}, App: ${row.application_name}, State: ${row.state}, Started: ${row.backend_start}`);
    });
    
    // Check max_connections
    const maxConnResult = await client.query('SHOW max_connections');
    console.log('Max connections:', maxConnResult.rows[0].max_connections);
    
    // Terminate idle connections that are older than 5 minutes
    const terminateQuery = `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND state = 'idle'
      AND state_change < NOW() - INTERVAL '5 minutes';
    `;
    
    const terminated = await client.query(terminateQuery);
    console.log('Terminated idle connections:', terminated.rows.length);
    
    // Check connections after cleanup
    const afterCleanup = await client.query(connectionsQuery);
    console.log('Connections after cleanup:', afterCleanup.rows.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

terminateConnections();
