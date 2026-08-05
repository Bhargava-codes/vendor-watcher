/**
 * SSRF guard for every outbound fetch the capture engine performs.
 *
 * User-supplied watch URLs must never be able to reach internal infrastructure,
 * so we validate scheme + host before the request and re-validate on every
 * redirect hop (redirects are followed manually).
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

function isPrivateIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "::" ) return true;
  if (h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("::ffff:")) return isPrivateIPv4(h.slice(7));
  return false;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/** Validates an absolute URL is safe to fetch from the server. */
export function assertSafeUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid web address." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "Only http(s) addresses can be monitored." };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");

  if (!host) return { ok: false, reason: "That address has no host." };
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return { ok: false, reason: "That address points at an internal host." };
  }
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    return { ok: false, reason: "That address points at a private network." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Addresses with embedded credentials aren't allowed." };
  }

  return { ok: true, url };
}

/**
 * fetch() with SSRF checks on the initial URL and on every redirect hop.
 * Redirects are followed manually so a safe host cannot bounce us to an
 * internal one.
 */
export async function safeFetch(
  raw: string,
  init: RequestInit & { timeoutMs?: number; maxRedirects?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15000, maxRedirects = 5, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = raw;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const checked = assertSafeUrl(current);
      if (!checked.ok) throw new Error(checked.reason);

      const res = await fetch(checked.url.toString(), {
        ...rest,
        signal: controller.signal,
        redirect: "manual",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return res;
        current = new URL(location, checked.url).toString();
        continue;
      }
      return res;
    }
    throw new Error("Too many redirects");
  } finally {
    clearTimeout(timer);
  }
}
