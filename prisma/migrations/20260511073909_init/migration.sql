-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VideoModel" AS ENUM ('RUNWAY', 'KLING', 'LUMA', 'PIKA');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'ERROR');

-- CreateEnum
CREATE TYPE "AiModel" AS ENUM ('RUNWAY_GEN3', 'KLING_V1', 'KLING_V2', 'LUMA_DREAM', 'PIKA_V2');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "narocnik" TEXT NOT NULL,
    "opis" TEXT,
    "nastavitve" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_configs" (
    "id" TEXT NOT NULL,
    "branding" JSONB NOT NULL DEFAULT '{}',
    "enabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emotionalStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "printerConfig" JSONB NOT NULL DEFAULT '{}',
    "aiModel" "AiModel" NOT NULL DEFAULT 'RUNWAY_GEN3',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "guestName" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "cloudinaryUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "poseAnalysis" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_videos" (
    "id" TEXT NOT NULL,
    "model" "VideoModel" NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "videoUrl" TEXT,
    "latencyMs" INTEGER,
    "costUsd" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "photoId" TEXT NOT NULL,

    CONSTRAINT "generated_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_ratings" (
    "id" TEXT NOT NULL,
    "styleMatch" INTEGER NOT NULL,
    "overallQuality" INTEGER NOT NULL,
    "isContextual" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedVideoId" TEXT NOT NULL,

    CONSTRAINT "video_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE INDEX "projects_slug_idx" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_narocnik_idx" ON "projects"("narocnik");

-- CreateIndex
CREATE INDEX "projects_createdAt_idx" ON "projects"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_configs_projectId_key" ON "project_configs"("projectId");

-- CreateIndex
CREATE INDEX "sessions_projectId_idx" ON "sessions"("projectId");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_createdAt_idx" ON "sessions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "photos_cloudinaryPublicId_key" ON "photos"("cloudinaryPublicId");

-- CreateIndex
CREATE INDEX "photos_sessionId_idx" ON "photos"("sessionId");

-- CreateIndex
CREATE INDEX "photos_cloudinaryPublicId_idx" ON "photos"("cloudinaryPublicId");

-- CreateIndex
CREATE INDEX "photos_createdAt_idx" ON "photos"("createdAt");

-- CreateIndex
CREATE INDEX "generated_videos_photoId_idx" ON "generated_videos"("photoId");

-- CreateIndex
CREATE INDEX "generated_videos_status_idx" ON "generated_videos"("status");

-- CreateIndex
CREATE INDEX "generated_videos_model_idx" ON "generated_videos"("model");

-- CreateIndex
CREATE INDEX "generated_videos_createdAt_idx" ON "generated_videos"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "video_ratings_generatedVideoId_key" ON "video_ratings"("generatedVideoId");

-- CreateIndex
CREATE INDEX "video_ratings_generatedVideoId_idx" ON "video_ratings"("generatedVideoId");

-- CreateIndex
CREATE INDEX "video_ratings_styleMatch_idx" ON "video_ratings"("styleMatch");

-- CreateIndex
CREATE INDEX "video_ratings_overallQuality_idx" ON "video_ratings"("overallQuality");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_configs" ADD CONSTRAINT "project_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_videos" ADD CONSTRAINT "generated_videos_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_ratings" ADD CONSTRAINT "video_ratings_generatedVideoId_fkey" FOREIGN KEY ("generatedVideoId") REFERENCES "generated_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
