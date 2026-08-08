-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "recurringSeriesId" TEXT;

-- CreateTable
CREATE TABLE "RecurringBookingSeries" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "occurrenceCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "RecurringBookingSeries_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "RecurringBookingSeries_weekday_check"
        CHECK ("weekday" BETWEEN 1 AND 7),

    CONSTRAINT "RecurringBookingSeries_occurrenceCount_check"
        CHECK ("occurrenceCount" BETWEEN 2 AND 12)
);

-- CreateIndex
CREATE INDEX "RecurringBookingSeries_userId_createdAt_idx"
ON "RecurringBookingSeries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_recurringSeriesId_idx"
ON "Booking"("recurringSeriesId");

-- AddForeignKey
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_recurringSeriesId_fkey"
FOREIGN KEY ("recurringSeriesId")
REFERENCES "RecurringBookingSeries"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBookingSeries"
ADD CONSTRAINT "RecurringBookingSeries_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBookingSeries"
ADD CONSTRAINT "RecurringBookingSeries_roomId_fkey"
FOREIGN KEY ("roomId")
REFERENCES "Room"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;