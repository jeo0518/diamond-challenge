-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Restaurant" (
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

-- CreateTable
CREATE TABLE "TimeSlotRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxOrdersPerSlot" INTEGER NOT NULL DEFAULT 2,
    CONSTRAINT "TimeSlotRule_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "basePrice" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "bulkPrice" INTEGER,
    "bulkMinQty" INTEGER,
    CONSTRAINT "MenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OptionGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Option_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulkDiscountTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    CONSTRAINT "BulkDiscountTier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "fulfillment" TEXT NOT NULL,
    "deliveryAddress" TEXT,
    "scheduledFor" DATETIME NOT NULL,
    "participantDeadline" DATETIME NOT NULL,
    "expectedHeadcount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'COLLECTING',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "ownerNote" TEXT,
    "rejectReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupOrder_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupOrderId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantToken" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "itemNameSnapshot" TEXT NOT NULL,
    "unitPriceSnapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selectedOptionsSnapshot" JSONB NOT NULL,
    "specialInstructions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderLine_groupOrderId_fkey" FOREIGN KEY ("groupOrderId") REFERENCES "GroupOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderLine_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupOrderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusEvent_groupOrderId_fkey" FOREIGN KEY ("groupOrderId") REFERENCES "GroupOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderStatusEvent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Restaurant_ownerId_idx" ON "Restaurant"("ownerId");

-- CreateIndex
CREATE INDEX "TimeSlotRule_restaurantId_idx" ON "TimeSlotRule"("restaurantId");

-- CreateIndex
CREATE INDEX "MenuCategory_restaurantId_idx" ON "MenuCategory"("restaurantId");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_idx" ON "MenuItem"("restaurantId");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- CreateIndex
CREATE INDEX "OptionGroup_menuItemId_idx" ON "OptionGroup"("menuItemId");

-- CreateIndex
CREATE INDEX "Option_optionGroupId_idx" ON "Option"("optionGroupId");

-- CreateIndex
CREATE INDEX "BulkDiscountTier_restaurantId_idx" ON "BulkDiscountTier"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupOrder_shareCode_key" ON "GroupOrder"("shareCode");

-- CreateIndex
CREATE INDEX "GroupOrder_restaurantId_status_idx" ON "GroupOrder"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "GroupOrder_organizerId_idx" ON "GroupOrder"("organizerId");

-- CreateIndex
CREATE INDEX "OrderLine_groupOrderId_idx" ON "OrderLine"("groupOrderId");

-- CreateIndex
CREATE INDEX "OrderLine_menuItemId_idx" ON "OrderLine"("menuItemId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_groupOrderId_idx" ON "OrderStatusEvent"("groupOrderId");
