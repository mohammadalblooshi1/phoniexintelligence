import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/app", "/admin", "/onboarding"];

// Optimistic check only: send visitors without a session cookie to the login page.
// Pages still verify the session against the database before showing any data.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  if (isProtected && !request.cookies.get("phx_session")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/onboarding/:path*"],
};
