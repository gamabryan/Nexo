import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function isPublic(pathname: string) {
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname.startsWith("/proposal")) return true;
  if (pathname.startsWith("/uploads/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname === "/api/register") return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  return /^\/api\/proposals\/[^/]+$/.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
