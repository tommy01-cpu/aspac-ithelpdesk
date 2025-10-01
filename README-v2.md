# files needed
1. Dockerfile
2. .dockerignore
3. next.config.js - 
    const nextConfig = {
        output: 'standalone', // Required for Docker builds
4. cloudbuild.yaml

# build cloud

gcloud builds submit --config cloudbuild.yaml

gcloud projects add-iam-policy-binding aspac-vm --member="serviceAccount:570317768245@cloudbuild.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding aspac-vm --member="serviceAccount:570317768245@cloudbuild.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"


# set variables
# ithelpdesk 
gcloud run services update ithelpdesk --region=asia-southeast1 --set-env-vars="DATABASE_URL=postgresql://postgres:~2D(ub*V{RsE%+k)@localhost:5432/ithelpdesk_db?host=/cloudsql/aspac-vm:asia-southeast1:ithelpdesk-db,ATTACHMENTS_DATABASE_URL=postgresql://postgres:~2D(ub*V{RsE%+k)@localhost:5432/ithelpdesk_attachments?host=/cloudsql/aspac-vm:asia-southeast1:ithelpdesk-db,NODE_ENV=production,NEXTAUTH_URL=https://ithelpdesk-369463028575.asia-southeast1.run.app,NEXT_PUBLIC_BASE_URL=https://ithelpdesk-369463028575.asia-southeast1.run.app,CLOUD_SQL_CONNECTION_NAME=aspac-vm:asia-southeast1:ithelpdesk-db,NEXTAUTH_SECRET=c43581fecccaa707d60c125f6cfe001de93c481d2e639d29d9b55b72dedeb9a0,TZ=Asia/Manila"


gcloud run services update ithelpdesk --region=asia-southeast1 --set-env-vars="DATABASE_URL=postgresql://postgres:~2D(ub*V{RsE%+k)@localhost:5432/ithelpdesk_db?host=/cloudsql/aspac-vm:asia-southeast1:ithelpdesk-db,ATTACHMENTS_DATABASE_URL=postgresql://postgres:~2D(ub*V{RsE%+k)@localhost:5432/ithelpdesk_attachments?host=/cloudsql/aspac-vm:asia-southeast1:ithelpdesk-db,NODE_ENV=production,NEXTAUTH_URL=https://ithelpdesk.aspacphils.com.ph,NEXT_PUBLIC_BASE_URL=https://ithelpdesk.aspacphils.com.ph,CLOUD_SQL_CONNECTION_NAME=aspac-vm:asia-southeast1:ithelpdesk-db,NEXTAUTH_SECRET=c43581fecccaa707d60c125f6cfe001de93c481d2e639d29d9b55b72dedeb9a0,TZ=Asia/Manila"

https://ithelpdesk-369463028575.asia-southeast1.run.app

# restore Db (Cloud)

PGPASSWORD="eCN^2CPVT7.eA:15" pg_restore -h 34.61.129.126 -p 5432 -U postgres -d ithelpdesk_db --clean --if-exists ithelpdesk_db.backup

PGPASSWORD="eCN^2CPVT7.eA:15" pg_restore -h 34.61.129.126 -p 5432 -U postgres -d ithelpdesk_attachments --clean --if-exists ithelpdesk_attachments.backup

# Alternative: Force clean restore (Cloud) - Use if above fails
# Terminate active sessions and drop/recreate database
# For ithelpdesk_db:
PGPASSWORD="eCN^2CPVT7.eA:15" psql -h 34.61.129.126 -p 5432 -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ithelpdesk_db' AND pid <> pg_backend_pid();"
PGPASSWORD="eCN^2CPVT7.eA:15" psql -h 34.61.129.126 -p 5432 -U postgres -c "DROP DATABASE IF EXISTS ithelpdesk_db;"
PGPASSWORD="eCN^2CPVT7.eA:15" psql -h 34.61.129.126 -p 5432 -U postgres -c "CREATE DATABASE ithelpdesk_db;"
PGPASSWORD="eCN^2CPVT7.eA:15" pg_restore -h 34.61.129.126 -p 5432 -U postgres -d ithelpdesk_db ithelpdesk_db.backup

# For ithelpdesk_attachments:
PGPASSWORD="eCN^2CPVT7.eA:15" psql -h 34.61.129.126 -p 5432 -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ithelpdesk_attachments' AND pid <> pg_backend_pid();"
PGPASSWORD="eCN^2CPVT7.eA:15" psql -h 34.61.129.126 -p 5432 -U postgres -c "DROP DATABASE IF EXISTS ithelpdesk_attachments;"
PGPASSWORD="eCN^2CPVT7.eA:15" psql -h 34.61.129.126 -p 5432 -U postgres -c "CREATE DATABASE ithelpdesk_attachments;"
PGPASSWORD="eCN^2CPVT7.eA:15" pg_restore -h 34.61.129.126 -p 5432 -U postgres -d ithelpdesk_attachments ithelpdesk_attachments.backup

# restore Db (Local)

# add table for backup Approvers /local
psql -h localhost -p 5432 -U postgres -d ithelpdesk_db -f "database/backup_approvers_postgresql.sql"

PGPASSWORD="P@SSW0RD" pg_restore -h localhost -p 5432 -U postgres -d ithelpdesk_db --clean --if-exists ithelpdesk_db.backup

PGPASSWORD="P@SSW0RD" pg_restore -h localhost -p 5432 -U postgres -d ithelpdesk_attachments --clean --if-exists ithelpdesk_attachments.backup

# Alternative: Force clean restore (Local) - Use if above fails
# Terminate active sessions and drop/recreate database
# For ithelpdesk_db:
PGPASSWORD="P@SSW0RD" psql -h localhost -p 5432 -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ithelpdesk_db' AND pid <> pg_backend_pid();"
PGPASSWORD="P@SSW0RD" psql -h localhost -p 5432 -U postgres -c "DROP DATABASE IF EXISTS ithelpdesk_db;"
PGPASSWORD="P@SSW0RD" psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE ithelpdesk_db;"
PGPASSWORD="P@SSW0RD" pg_restore -h localhost -p 5432 -U postgres -d ithelpdesk_db ithelpdesk_db.backup

# For ithelpdesk_attachments:
PGPASSWORD="P@SSW0RD" psql -h localhost -p 5432 -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ithelpdesk_attachments' AND pid <> pg_backend_pid();"
PGPASSWORD="P@SSW0RD" psql -h localhost -p 5432 -U postgres -c "DROP DATABASE IF EXISTS ithelpdesk_attachments;"
PGPASSWORD="P@SSW0RD" psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE ithelpdesk_attachments;"
PGPASSWORD="P@SSW0RD" pg_restore -h localhost -p 5432 -U postgres -d ithelpdesk_attachments ithelpdesk_attachments.backup



# backup cloud

PGPASSWORD="eCN^2CPVT7.eA:15" pg_dump -h 34.61.129.126 -p 5432 -U postgres -d ithelpdesk_db -F c -f ithelpdesk_db




PGPASSWORD="eCN^2CPVT7.eA:15" psql -h 34.61.129.126 -p 5432 -U postgres -c "DROP DATABASE IF EXISTS ithelpdesk_db.back;"

PGPASSWORD="eCN^2CPVT7.eA:15" pg_dump -h 34.61.129.126 -p 5432 -U postgres -d ithelpdesk_attachments -F c -f ithelpdesk_attachments.backup


PGPASSWORD="~2D(ub*V{RsE%+k)" pg_restore -h 34.126.122.104 -p 5432 -U postgres -d ithelpdesk_db --clean --if-exists ithelpdesk_db.backup

PGPASSWORD="~2D(ub*V{RsE%+k)" pg_restore -h 34.126.122.104 -p 5432 -U postgres -d ithelpdesk_attachments --clean --if-exists ithelpdesk_attachments.backup