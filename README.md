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
gcloud run services update ithelpdesk --region=us-central1 --set-env-vars="DATABASE_URL=postgresql://postgres:eCN^2CPVT7.eA:15@localhost:5432/ithelpdesk_db?host=/cloudsql/aspac-vm:us-central1:ithelpdesk-new,ATTACHMENTS_DATABASE_URL=postgresql://postgres:eCN^2CPVT7.eA:15@localhost:5432/ithelpdesk_attachments?host=/cloudsql/aspac-vm:us-central1:ithelpdesk-new,NODE_ENV=production,NEXTAUTH_URL=https://ithelpdesk-369463028575.us-central1.run.app,NEXT_PUBLIC_BASE_URL=https://ithelpdesk-369463028575.us-central1.run.app,CLOUD_SQL_CONNECTION_NAME=aspac-vm:us-central1:ithelpdesk-new,NEXTAUTH_SECRET=c43581fecccaa707d60c125f6cfe001de93c481d2e639d29d9b55b72dedeb9a0"


# restore Db

PGPASSWORD="eCN^2CPVT7.eA:15" pg_restore -h 34.61.129.126 -p 5432 -U postgres -d ithelpdesk_db --clean  ithelpdesk_db.backup

PGPASSWORD="eCN^2CPVT7.eA:15" pg_restore -h 34.61.129.126 -p 5432 -U postgres -d ithelpdesk_attachments --clean ithelpdesk_attachments.backup