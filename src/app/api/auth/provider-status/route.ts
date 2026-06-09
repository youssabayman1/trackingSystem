import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { message: "Supabase URL or publishable key is missing." },
      { status: 500 },
    );
  }

  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: {
      apikey: key,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: `Failed to fetch Supabase auth settings (${response.status}).` },
      { status: 500 },
    );
  }

  const settings = (await response.json()) as {
    external?: Record<string, boolean>;
    disable_signup?: boolean;
  };

  return NextResponse.json({
    projectUrl: url,
    azureEnabled: Boolean(settings.external?.azure),
    externalProviders: settings.external ?? {},
    disableSignup: settings.disable_signup ?? false,
  });
}
