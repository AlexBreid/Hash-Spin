-- CreateTable
CREATE TABLE "OneTimeAuthToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OneTimeAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeAuthToken_token_key" ON "OneTimeAuthToken"("token");

-- CreateIndex
CREATE INDEX "OneTimeAuthToken_token_expiresAt_idx" ON "OneTimeAuthToken"("token", "expiresAt");

-- AddForeignKey
ALTER TABLE "OneTimeAuthToken" ADD CONSTRAINT "OneTimeAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
