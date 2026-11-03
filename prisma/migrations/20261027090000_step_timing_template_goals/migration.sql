-- Step timing: a week of onboarding on template and plan steps, and an optional fixed date on plan steps.
ALTER TABLE "TemplateStep" ADD COLUMN "week" INTEGER;
ALTER TABLE "PlanStep" ADD COLUMN "week" INTEGER,
ADD COLUMN "dueDate" TIMESTAMP(3);

-- Goals in templates, copied into plans like steps.
CREATE TABLE "TemplateGoal" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "withinWeeks" INTEGER,

    CONSTRAINT "TemplateGoal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Goal" ADD COLUMN "templateGoalId" TEXT,
ADD COLUMN "tailored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "removed" BOOLEAN NOT NULL DEFAULT false;

-- Every existing goal was added by a lead, so it is the lead's own: template pushes must leave it alone.
UPDATE "Goal" SET "tailored" = true;

ALTER TABLE "TemplateGoal" ADD CONSTRAINT "TemplateGoal_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_templateGoalId_fkey" FOREIGN KEY ("templateGoalId") REFERENCES "TemplateGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
