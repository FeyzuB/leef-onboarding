-- CreateEnum
CREATE TYPE "GuideCategory" AS ENUM ('HOW_TO', 'PRACTICAL');

-- AlterTable
ALTER TABLE "PlanStep" ADD COLUMN     "guideId" TEXT;

-- AlterTable
ALTER TABLE "TeamResource" ADD COLUMN     "category" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "TemplateStep" ADD COLUMN     "guideId" TEXT;

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "GuideCategory" NOT NULL DEFAULT 'HOW_TO',
    "body" TEXT NOT NULL DEFAULT '',
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpContact" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "HelpContact_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TemplateStep" ADD CONSTRAINT "TemplateStep_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanStep" ADD CONSTRAINT "PlanStep_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

