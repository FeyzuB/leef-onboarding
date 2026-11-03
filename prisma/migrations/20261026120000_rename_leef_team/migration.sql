-- LEEF is a product, not a team: the seeded "LEEF" team is the R&D team and its
-- "LEEF developer" template is the Developer template. Skipped where already renamed.
UPDATE "Team" SET "name" = 'R&D'
WHERE "name" = 'LEEF' AND NOT EXISTS (SELECT 1 FROM "Team" WHERE lower("name") = 'r&d');

UPDATE "Template" SET "title" = 'Developer' WHERE "title" = 'LEEF developer';

UPDATE "TemplateStep" SET "title" = 'Who''s who in the R&D team' WHERE "title" = 'Who''s who in the LEEF team';
UPDATE "PlanStep" SET "title" = 'Who''s who in the R&D team' WHERE "title" = 'Who''s who in the LEEF team' AND NOT "tailored";
