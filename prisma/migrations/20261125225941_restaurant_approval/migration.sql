-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "phone" TEXT NOT NULL,
    "hours" TEXT,
    "imageUrl" TEXT,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "acceptsGroupOrders" BOOLEAN NOT NULL DEFAULT true,
    "minGroupSize" INTEGER NOT NULL DEFAULT 10,
    "maxGroupSize" INTEGER,
    "leadTimeHours" INTEGER NOT NULL DEFAULT 24,
    "allowsPickup" BOOLEAN NOT NULL DEFAULT true,
    "allowsDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRadiusMiles" REAL,
    "deliveryFee" INTEGER,
    "serviceFee" INTEGER,
    "organizerNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Restaurant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Restaurant" ("acceptsGroupOrders", "address", "allowsDelivery", "allowsPickup", "createdAt", "cuisine", "deliveryFee", "deliveryRadiusMiles", "description", "hours", "id", "imageUrl", "isSample", "lat", "leadTimeHours", "lng", "maxGroupSize", "minGroupSize", "name", "organizerNotes", "ownerId", "phone", "serviceFee") SELECT "acceptsGroupOrders", "address", "allowsDelivery", "allowsPickup", "createdAt", "cuisine", "deliveryFee", "deliveryRadiusMiles", "description", "hours", "id", "imageUrl", "isSample", "lat", "leadTimeHours", "lng", "maxGroupSize", "minGroupSize", "name", "organizerNotes", "ownerId", "phone", "serviceFee" FROM "Restaurant";
DROP TABLE "Restaurant";
ALTER TABLE "new_Restaurant" RENAME TO "Restaurant";
CREATE INDEX "Restaurant_ownerId_idx" ON "Restaurant"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Sample restaurants stay visible after this change (they were all public before).
UPDATE "Restaurant" SET "isApproved" = true, "approvedAt" = CURRENT_TIMESTAMP WHERE "isSample" = true;
