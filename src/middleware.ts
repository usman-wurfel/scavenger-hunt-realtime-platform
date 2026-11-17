import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME, extractBearerToken } from "@/lib/auth";

const publicPaths = [
  "/auth/sign-in",
  "/auth/password-reset",
  "/auth/password-new",
  "/auth/password-sent",
  "/scan",
  "/push/test",
];

const authApiPaths = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

const publicApiPaths = [
  "/api/settings/branding",
  "/api/uploads",
  "/api/hunts/active",
  "/api/hunts/join",
  "/api/hunts/scan",
  "/api/hunts/prize",
  "/api/areas",
  "/api/player/areas",
  "/api/mqtt/auth",
  "/api/docs",
  "/api/push/test",
];

const docsPaths = ["/admin/api-docs", "/user/api-docs"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const bearerToken = extractBearerToken(request.headers.get("authorization"));
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  const token = bearerToken ?? cookieToken;

  // Next.js production does not serve files written to /public after start.
  // Rewrite so /uploads/* is served from disk via the API route.
  if (pathname.startsWith("/uploads/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/api/uploads/${pathname.slice("/uploads/".length)}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  if (pathname === "/forgot-password") {
    return NextResponse.redirect(new URL("/auth/password-reset", request.url));
  }

  if (pathname.startsWith("/reset-password")) {
    const resetToken = request.nextUrl.searchParams.get("token");
    const url = new URL("/auth/password-new", request.url);
    if (resetToken) url.searchParams.set("token", resetToken);
    return NextResponse.redirect(url);
  }

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isAuthApi = authApiPaths.some((path) => pathname.startsWith(path));
  const isPublicApi = publicApiPaths.some((path) => pathname.startsWith(path));
  const isApiRoute = pathname.startsWith("/api");

  if (isAuthApi || isPublicApi) {
    return NextResponse.next();
  }

  if (docsPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const session = token ? await verifyToken(token) : null;
  const isAuthenticated = !!session;

  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicPath && !isApiRoute && !isAuthenticated) {
    if (pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/settings") || pathname.startsWith("/profile") || pathname.startsWith("/alert-types") || pathname.startsWith("/hunts") || pathname.startsWith("/areas") || pathname.startsWith("/broadcast")) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }
  }

  if (isApiRoute && !isAuthApi && !isAuthenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|initial-loader|images).*)"],
};
