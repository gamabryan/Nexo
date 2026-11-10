import { AppShell } from "@/components/app-shell";
import { StockDashboard } from "@/components/stock-dashboard";
import { prisma } from "@/lib/prisma";
import { toStockProduct } from "@/lib/serialize";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const user = await requireUser();
  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: [{ name: "asc" }],
  });

  return (
    <AppShell companyName={user.companyName}>
      <StockDashboard products={products.map(toStockProduct)} />
    </AppShell>
  );
}

