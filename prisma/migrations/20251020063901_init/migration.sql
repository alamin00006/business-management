-- AlterTable
ALTER TABLE "_CustomerToSaleReturn" ADD CONSTRAINT "_CustomerToSaleReturn_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_CustomerToSaleReturn_AB_unique";

-- AlterTable
ALTER TABLE "_InventoryLogToPurchase" ADD CONSTRAINT "_InventoryLogToPurchase_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_InventoryLogToPurchase_AB_unique";

-- AlterTable
ALTER TABLE "_InventoryLogToSale" ADD CONSTRAINT "_InventoryLogToSale_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_InventoryLogToSale_AB_unique";
