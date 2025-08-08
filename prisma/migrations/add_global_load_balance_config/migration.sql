-- CreateTable
CREATE TABLE "global_load_balance_config" (
    "id" SERIAL NOT NULL,
    "support_group_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "load_balance_type" VARCHAR(20) NOT NULL DEFAULT 'load_balancing',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_load_balance_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_load_balance_config_support_group_id_key" ON "global_load_balance_config"("support_group_id");

-- AddForeignKey
ALTER TABLE "global_load_balance_config" ADD CONSTRAINT "global_load_balance_config_support_group_id_fkey" FOREIGN KEY ("support_group_id") REFERENCES "support_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
