-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MenuCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MenuCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MenuCategory" ("id", "name", "restaurantId", "sortOrder") SELECT "id", "name", "restaurantId", "sortOrder" FROM "MenuCategory";
DROP TABLE "MenuCategory";
ALTER TABLE "new_MenuCategory" RENAME TO "MenuCategory";
CREATE INDEX "MenuCategory_restaurantId_idx" ON "MenuCategory"("restaurantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
