function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing.`);
  }

  return value;
}

export function getAuthEnv() {
  return {
    accessSecret: requireEnv("JWT_ACCESS_SECRET"),
    refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
  };
}
