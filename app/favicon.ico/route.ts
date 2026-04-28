import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/favicon.svg", request.url), 308);
}

export function HEAD(request: NextRequest) {
  return NextResponse.redirect(new URL("/favicon.svg", request.url), 308);
}
