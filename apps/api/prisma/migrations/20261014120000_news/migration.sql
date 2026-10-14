-- CreateEnum
CREATE TYPE "NewsKind" AS ENUM ('article', 'video', 'hn', 'devto', 'repo', 'release');

-- CreateTable
CREATE TABLE "news_items" (
    "id" TEXT NOT NULL,
    "kind" "NewsKind" NOT NULL,
    "source" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lang" "Lang" NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "image" TEXT,
    "author" TEXT,
    "published_at" TIMESTAMPTZ NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_ingest_runs" (
    "id" SERIAL NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "items" INTEGER NOT NULL DEFAULT 0,
    "sources_ok" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "news_ingest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_items_url_key" ON "news_items"("url");

-- CreateIndex
CREATE INDEX "news_items_category_published_at_idx" ON "news_items"("category", "published_at" DESC);

-- CreateIndex
CREATE INDEX "news_items_kind_published_at_idx" ON "news_items"("kind", "published_at" DESC);

