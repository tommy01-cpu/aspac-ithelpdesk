-- Add missing columns to report_templates table
ALTER TABLE "report_templates" 
ADD COLUMN IF NOT EXISTS "folder_id" INTEGER,
ADD COLUMN IF NOT EXISTS "report_type" VARCHAR(255) DEFAULT 'template';

-- Create report_folders table
CREATE TABLE IF NOT EXISTS "report_folders" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_folders_pkey" PRIMARY KEY ("id")
);

-- Create indexes for report_folders
CREATE INDEX IF NOT EXISTS "report_folders_created_by_idx" ON "report_folders"("created_by");
CREATE INDEX IF NOT EXISTS "report_folders_parent_id_idx" ON "report_folders"("parent_id");
CREATE INDEX IF NOT EXISTS "report_folders_is_shared_idx" ON "report_folders"("is_shared");

-- Add foreign key constraints (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_folders_created_by_fkey'
    ) THEN
        ALTER TABLE "report_folders" 
        ADD CONSTRAINT "report_folders_created_by_fkey" 
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_folders_parent_id_fkey'
    ) THEN
        ALTER TABLE "report_folders" 
        ADD CONSTRAINT "report_folders_parent_id_fkey" 
        FOREIGN KEY ("parent_id") REFERENCES "report_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_templates_folder_id_fkey'
    ) THEN
        ALTER TABLE "report_templates" 
        ADD CONSTRAINT "report_templates_folder_id_fkey" 
        FOREIGN KEY ("folder_id") REFERENCES "report_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_report_folders_updated_at ON "report_folders";
CREATE TRIGGER update_report_folders_updated_at 
BEFORE UPDATE ON "report_folders" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
