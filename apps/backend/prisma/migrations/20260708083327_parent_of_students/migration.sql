-- CreateTable
CREATE TABLE "_parent_of" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_parent_of_AB_unique" ON "_parent_of"("A", "B");

-- CreateIndex
CREATE INDEX "_parent_of_B_index" ON "_parent_of"("B");

-- AddForeignKey
ALTER TABLE "_parent_of" ADD CONSTRAINT "_parent_of_A_fkey" FOREIGN KEY ("A") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_parent_of" ADD CONSTRAINT "_parent_of_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
