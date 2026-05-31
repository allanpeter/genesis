-- CreateTable
CREATE TABLE "company_profiles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sector" TEXT,
    "description" TEXT,
    "businessModel" TEXT,
    "targetAudience" TEXT,
    "tone" TEXT,
    "managerName" TEXT,
    "managerRole" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_organizationId_key" ON "company_profiles"("organizationId");

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
