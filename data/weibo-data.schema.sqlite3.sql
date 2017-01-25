CREATE TABLE "member" ("id" INTEGER NOT NULL PRIMARY KEY, "name" TEXT NOT NULL);
CREATE TABLE "status" ("id" INTEGER NOT NULL PRIMARY KEY, "author_id" INTEGER NOT NULL, "created_at" DATETIME NOT NULL, "body" TEXT NOT NULL, "complete_link" TEXT, "images" TEXT NOT NULL, "repost" INTEGER NOT NULL, "orig_author" TEXT, "orig_body" TEXT, "orig_complete_link" TEXT, "orig_images" TEXT NOT NULL, FOREIGN KEY ("author_id") REFERENCES "member" ("id"));
CREATE INDEX "status_author_id" ON "status" ("author_id");
CREATE TABLE "comment" ("id" INTEGER NOT NULL PRIMARY KEY, "status_id" INTEGER NOT NULL, "commenter_id" INTEGER NOT NULL, "created_at" DATETIME NOT NULL, "body" TEXT NOT NULL, "image" TEXT, FOREIGN KEY ("status_id") REFERENCES "status" ("id"), FOREIGN KEY ("commenter_id") REFERENCES "member" ("id"));
CREATE INDEX "comment_status_id" ON "comment" ("status_id");
CREATE INDEX "comment_commenter_id" ON "comment" ("commenter_id");
