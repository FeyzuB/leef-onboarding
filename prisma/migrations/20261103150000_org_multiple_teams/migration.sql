-- Who is who: a person can be in several teams and manage several teams.
-- The single OrgEntry.teamId becomes the first team membership; nothing is lost.

-- CreateTable
CREATE TABLE "_OrgEntryTeams" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_OrgEntryManages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_OrgEntryTeams_AB_unique" ON "_OrgEntryTeams"("A", "B");

-- CreateIndex
CREATE INDEX "_OrgEntryTeams_B_index" ON "_OrgEntryTeams"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_OrgEntryManages_AB_unique" ON "_OrgEntryManages"("A", "B");

-- CreateIndex
CREATE INDEX "_OrgEntryManages_B_index" ON "_OrgEntryManages"("B");

-- AddForeignKey
ALTER TABLE "_OrgEntryTeams" ADD CONSTRAINT "_OrgEntryTeams_A_fkey" FOREIGN KEY ("A") REFERENCES "OrgEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrgEntryTeams" ADD CONSTRAINT "_OrgEntryTeams_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrgEntryManages" ADD CONSTRAINT "_OrgEntryManages_A_fkey" FOREIGN KEY ("A") REFERENCES "OrgEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrgEntryManages" ADD CONSTRAINT "_OrgEntryManages_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry the existing team over before the column goes.
INSERT INTO "_OrgEntryTeams" ("A", "B")
SELECT "id", "teamId" FROM "OrgEntry" WHERE "teamId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "OrgEntry" DROP CONSTRAINT "OrgEntry_teamId_fkey";

-- AlterTable
ALTER TABLE "OrgEntry" DROP COLUMN "teamId";
