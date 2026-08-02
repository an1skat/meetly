-- CreateTable
CREATE TABLE "BookingSlot" (
    "bookingId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookingSlot_pkey" PRIMARY KEY ("bookingId", "startsAt")
);

-- Backfill half-hour slots for bookings that already exist.
INSERT INTO "BookingSlot" ("bookingId", "roomId", "startsAt")
SELECT
    booking."id",
    booking."roomId",
    slot."startsAt"
FROM "Booking" AS booking
CROSS JOIN LATERAL generate_series(
    booking."startAt",
    booking."endAt" - INTERVAL '30 minutes',
    INTERVAL '30 minutes'
) AS slot("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSlot_roomId_startsAt_key"
ON "BookingSlot"("roomId", "startsAt");

-- AddForeignKey
ALTER TABLE "BookingSlot"
ADD CONSTRAINT "BookingSlot_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSlot"
ADD CONSTRAINT "BookingSlot_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
