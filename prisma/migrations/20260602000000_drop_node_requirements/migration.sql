-- The "requirements" feature was removed; drop the now-unused column so the
-- database matches the Prisma schema (which no longer declares Node.requirements).
ALTER TABLE "Node" DROP COLUMN IF EXISTS "requirements";
