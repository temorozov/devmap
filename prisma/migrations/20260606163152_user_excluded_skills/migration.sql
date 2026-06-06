-- AlterTable
ALTER TABLE "User" ADD COLUMN     "excludedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];
