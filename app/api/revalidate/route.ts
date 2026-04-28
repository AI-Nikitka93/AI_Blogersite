import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { POSTS_CACHE_TAG } from "../../../src/lib/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readSecret(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  const cronHeader = request.headers.get("x-cron-secret");
  if (cronHeader) {
    return cronHeader.trim();
  }

  const token = new URL(request.url).searchParams.get("token");
  return token?.trim() ?? null;
}

function assertAuthorized(request: Request): string | null {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return "CRON_SECRET is not configured.";
  }

  const provided = readSecret(request);
  if (!provided || provided !== expected) {
    return "Unauthorized revalidate request.";
  }

  return null;
}

async function revalidatePostsSurface(): Promise<void> {
  revalidateTag(POSTS_CACHE_TAG, "max");
  revalidatePath("/", "page");
  revalidatePath("/archive", "page");
  revalidatePath("/feed.xml");
}

export async function POST(request: Request): Promise<Response> {
  const authError = assertAuthorized(request);
  if (authError) {
    return NextResponse.json(
      { status: "failed", reason: authError },
      { status: authError.startsWith("Unauthorized") ? 401 : 500 },
    );
  }

  await revalidatePostsSurface();

  return NextResponse.json({
    status: "success",
    scope: "posts",
    tag: POSTS_CACHE_TAG,
  });
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
