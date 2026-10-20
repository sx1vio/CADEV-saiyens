-- AlterTable
ALTER TABLE "feedback_requests" ADD COLUMN     "url" TEXT;

-- CreateIndex
CREATE INDEX "feedback_requests_room_id_created_at_idx" ON "feedback_requests"("room_id", "created_at" DESC);
