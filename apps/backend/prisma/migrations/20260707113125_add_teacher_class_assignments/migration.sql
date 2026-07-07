-- CreateTable
CREATE TABLE "_class_assignments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_class_assignments_AB_unique" ON "_class_assignments"("A", "B");

-- CreateIndex
CREATE INDEX "_class_assignments_B_index" ON "_class_assignments"("B");

-- AddForeignKey
ALTER TABLE "_class_assignments" ADD CONSTRAINT "_class_assignments_A_fkey" FOREIGN KEY ("A") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_class_assignments" ADD CONSTRAINT "_class_assignments_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
