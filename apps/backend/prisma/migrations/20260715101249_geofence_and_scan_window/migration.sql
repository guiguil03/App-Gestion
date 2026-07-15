-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "geofence_corners" JSONB,
ADD COLUMN     "scan_window_end" TEXT,
ADD COLUMN     "scan_window_start" TEXT;
