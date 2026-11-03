-- A plan's manager and buddy (from Who is who), and step contacts that point at one of them.
CREATE TYPE "ContactRole" AS ENUM ('MANAGER', 'BUDDY');

ALTER TABLE "TemplateStep" ADD COLUMN "contactRole" "ContactRole";
ALTER TABLE "PlanStep" ADD COLUMN "contactRole" "ContactRole";

ALTER TABLE "Plan" ADD COLUMN "managerId" TEXT,
ADD COLUMN "buddyId" TEXT;

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "OrgEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_buddyId_fkey" FOREIGN KEY ("buddyId") REFERENCES "OrgEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
