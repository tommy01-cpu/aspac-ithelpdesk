# files needed
1. Dockerfile
2. .dockerignore
3. next.config.js - 
    const nextConfig = {
        output: 'standalone', // Required for Docker builds
4. cloudbuild.yaml

# build cloud

gcloud projects add-iam-policy-binding aspac-vm --member="serviceAccount:570317768245@cloudbuild.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding aspac-vm --member="serviceAccount:570317768245@cloudbuild.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"


# set variables
# ithelpdesk 
gcloud run services update ithelpdesk --region=us-central1 --set-env-vars="DATABASE_URL=postgresql://postgres:eCN^2CPVT7.eA:15@localhost:5432/ithelpdesk_db?host=/cloudsql/aspac-vm:us-central1:ithelpdesk-new,ATTACHMENTS_DATABASE_URL=postgresql://postgres:eCN^2CPVT7.eA:15@localhost:5432/ithelpdesk_attachments?host=/cloudsql/aspac-vm:us-central1:ithelpdesk-new,NODE_ENV=production,NEXTAUTH_URL=https://ithelpdesk-369463028575.us-central1.run.app,NEXT_PUBLIC_BASE_URL=https://ithelpdesk-369463028575.us-central1.run.app,CLOUD_SQL_CONNECTION_NAME=aspac-vm:us-central1:ithelpdesk-new,NEXTAUTH_SECRET=c43581fecccaa707d60c125f6cfe001de93c481d2e639d29d9b55b72dedeb9a0"

# backup and restore

gcloud sql instances describe [instance_name] \
  --format="value(serviceAccountEmailAddress)"

# result p369463028575-mj9yv4@gcp-sa-cloud-sql.iam.gserviceaccount.com

gsutil iam ch serviceAccount:SERVICE_ACCOUNT_EMAIL:roles/storage.objectCreator gs://aspacvmbucket

# result
gsutil iam ch serviceAccount:p369463028575-mj9yv4@gcp-sa-cloud-sql.iam.gserviceaccount.com:roles/storage.objectCreator gs://aspacvmbucket

# before executing
gcloud sql export sql [instance_name] gs://aspacvmbucket/backups/[db_name]_-$(date +%Y%m%d).sql \
  --database=[db_name]