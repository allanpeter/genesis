-- AlterTable: add parentId column
ALTER TABLE "agents" ADD COLUMN "parentId" TEXT;

-- CreateIndex: unique constraint on (organizationId, name)
ALTER TABLE "agents" ADD CONSTRAINT "agents_organizationId_name_key" UNIQUE ("organizationId", "name");

-- AddForeignKey: self-referential parent relation
ALTER TABLE "agents" ADD CONSTRAINT "agents_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
