import { NextResponse } from "next/server";

const REQUIRED_ENV_VARS = [
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MIRO_SITE_URL",
] as const;

function getMissingEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return !value || !value.trim();
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const missingEnvVars = getMissingEnvVars();
  const healthy = missingEnvVars.length === 0;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "ai-blogersite",
      checks: {
        env: healthy ? "pass" : "fail",
      },
      missing_env: missingEnvVars,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
    },
  );
}
