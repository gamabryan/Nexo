import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { User } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive } from "@/lib/subscription";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isSubscriptionActive(user)) redirect("/subscribe");
  return user;
}

type ActiveApiUserResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse };

/** Para route handlers: exige login e assinatura ativa. */
export async function requireActiveApiUser(): Promise<ActiveApiUserResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Faça login para continuar." }, { status: 401 }),
    };
  }
  if (!isSubscriptionActive(user)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Assinatura necessária para continuar.", code: "SUBSCRIPTION_REQUIRED" },
        { status: 402 },
      ),
    };
  }
  return { user, error: null };
}

export function isPlaceholderCompany(user: { name: string; companyName: string }) {
  return user.name === "Seu nome" && user.companyName === "Minha Oficina";
}
