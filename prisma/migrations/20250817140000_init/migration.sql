-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'STARTED', 'ENDED');

-- CreateEnum
CREATE TYPE "PrizeClaimStatus" AS ENUM ('NONE', 'WAITING', 'CLAIMED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Admin',
    "profilePhoto" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "deviceId" TEXT,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "appName" TEXT NOT NULL DEFAULT 'Scavenger Hunt',
    "logo" TEXT,
    "favicon" TEXT,
    "applicationLogo" TEXT,
    "playerNearbyRadius" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "copyrightText" TEXT NOT NULL DEFAULT '© 2026 Scavenger Hunt. All rights reserved.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertType" (
    "id" TEXT NOT NULL,
    "distanceFt" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "messageColor" TEXT NOT NULL DEFAULT '#000000',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuntEvent" (
    "id" TEXT NOT NULL,
    "areaId" TEXT,
    "eventName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "eventDate" DATE NOT NULL,
    "eventTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "eventCode" TEXT NOT NULL,
    "playerClue" TEXT NOT NULL,
    "playerNearbyRadius" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "qrCodeUrl" TEXT,
    "startingSoonNotifiedAt" TIMESTAMP(3),
    "fiveMinuteNotifiedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HuntEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hunt_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hunt_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuntParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "scanRank" INTEGER,
    "scannedAt" TIMESTAMP(3),
    "winnerMessage" TEXT,
    "winnerMessageSentAt" TIMESTAMP(3),
    "prizeClaimStatus" "PrizeClaimStatus" NOT NULL DEFAULT 'NONE',
    "prizeClaimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HuntParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_devices" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "fcmToken" TEXT,
    "participantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_area_subscriptions" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_area_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventProximityAlert" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "alertTypeId" TEXT NOT NULL,
    "distanceFt" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "messageColor" TEXT NOT NULL DEFAULT '#000000',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventProximityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AlertType_distanceFt_key" ON "AlertType"("distanceFt");

-- CreateIndex
CREATE UNIQUE INDEX "HuntEvent_eventCode_key" ON "HuntEvent"("eventCode");

-- CreateIndex
CREATE INDEX "HuntEvent_areaId_idx" ON "HuntEvent"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "hunt_areas_name_key" ON "hunt_areas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hunt_areas_slug_key" ON "hunt_areas"("slug");

-- CreateIndex
CREATE INDEX "hunt_areas_isActive_sortOrder_idx" ON "hunt_areas"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "HuntParticipant_username_key" ON "HuntParticipant"("username");

-- CreateIndex
CREATE INDEX "HuntParticipant_eventId_idx" ON "HuntParticipant"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "HuntParticipant_eventId_deviceId_key" ON "HuntParticipant"("eventId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "HuntParticipant_eventId_scanRank_key" ON "HuntParticipant"("eventId", "scanRank");

-- CreateIndex
CREATE UNIQUE INDEX "participant_devices_deviceId_fcmToken_key" ON "participant_devices"("deviceId", "fcmToken");

-- CreateIndex
CREATE INDEX "player_area_subscriptions_deviceId_idx" ON "player_area_subscriptions"("deviceId");

-- CreateIndex
CREATE INDEX "player_area_subscriptions_areaId_idx" ON "player_area_subscriptions"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "player_area_subscriptions_deviceId_areaId_key" ON "player_area_subscriptions"("deviceId", "areaId");

-- CreateIndex
CREATE UNIQUE INDEX "EventProximityAlert_eventId_alertTypeId_key" ON "EventProximityAlert"("eventId", "alertTypeId");

-- AddForeignKey
ALTER TABLE "HuntEvent" ADD CONSTRAINT "HuntEvent_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "hunt_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuntParticipant" ADD CONSTRAINT "HuntParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "HuntEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_area_subscriptions" ADD CONSTRAINT "player_area_subscriptions_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "hunt_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProximityAlert" ADD CONSTRAINT "EventProximityAlert_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "HuntEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProximityAlert" ADD CONSTRAINT "EventProximityAlert_alertTypeId_fkey" FOREIGN KEY ("alertTypeId") REFERENCES "AlertType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

