-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VideoJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "clipCount" INTEGER NOT NULL,
    "completedClips" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_VideoJob" ("clipCount", "createdAt", "fileName", "id", "status", "userId") SELECT "clipCount", "createdAt", "fileName", "id", "status", "userId" FROM "VideoJob";
DROP TABLE "VideoJob";
ALTER TABLE "new_VideoJob" RENAME TO "VideoJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
