import { hashWithSessionSecret } from "./session";

function normalize(value: string | null) {
  return value?.trim().toLowerCase() || "unknown";
}

function readClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("fly-client-ip") ||
    "unknown"
  );
}

export function createFingerprintHash(headers: Headers) {
  const value = [
    normalize(readClientIp(headers)),
    normalize(headers.get("user-agent")),
    normalize(headers.get("accept-language")),
    normalize(headers.get("sec-ch-ua-platform")),
  ].join("|");

  return hashWithSessionSecret("fingerprint", value);
}
