import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/backend_lib/infrastructure/supabase.server";
import { verifyAccessToken } from "@/backend_lib/services/jwt.service";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!token) {
      return NextResponse.json({ message: "Access token is missing." }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    const userId = payload.sub as string;

    const body = await request.json();
    const { latitude, longitude, accuracy, city, country } = body as {
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      city?: string | null;
      country?: string | null;
    };

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ message: "Invalid coordinates." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Resolve employee_id for this user (if any)
    const { data: userRow, error: userError } = await supabase
      .from("app_users")
      .select("id, employee_id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      throw new Error(userError.message);
    }

    const employeeId = (userRow as any)?.employee_id ?? null;

    const userAgent = request.headers.get("user-agent") ?? null;
    const ip = request.headers.get("x-forwarded-for") ?? null;

    // Try reverse-geocoding from coordinates if city/country not provided
    let resolvedCity: string | null = city ?? null;
    let resolvedCountry: string | null = country ?? null;

    if ((!resolvedCity || !resolvedCountry) && typeof latitude === "number" && typeof longitude === "number") {
      try {
        const nominatimEmail = process.env.NOMINATIM_EMAIL ?? "no-reply@example.com";
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          String(latitude),
        )}&lon=${encodeURIComponent(String(longitude))}&zoom=10&addressdetails=1`;

        const geoRes = await fetch(url, {
          headers: {
            "User-Agent": `dbInvesting-location-tracker/1.0 (${nominatimEmail})`,
            Accept: "application/json",
          },
        });

        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          const addr = geoJson?.address ?? null;

          if (addr) {
            resolvedCity = resolvedCity || addr.city || addr.town || addr.village || addr.hamlet || null;
            resolvedCountry = resolvedCountry || addr.country || addr.country_code || null;
          }
        }
      } catch {
        // ignore reverse-geocode failures — not critical
      }
    }

    const { error: insertError } = await supabase.from("employee_locations").insert({
      user_id: userId,
      employee_id: employeeId,
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      city: resolvedCity ?? null,
      country: resolvedCountry ?? null,
      ip: ip ?? null,
      user_agent: userAgent,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
