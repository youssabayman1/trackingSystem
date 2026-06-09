"use client";

export function usePublicDebug(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG === "true";
}
