import dns from "node:dns/promises";
import net from "node:net";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const INTERNAL_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

function normalizeHostname(hostname) {
  return hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function isPrivateIpv4(ip) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function expandIpv6(ip) {
  const normalizedIp = ip.toLowerCase();

  if (normalizedIp.includes(".")) {
    const ipv4Part = normalizedIp.slice(normalizedIp.lastIndexOf(":") + 1);
    if (isPrivateIpv4(ipv4Part)) return null;
  }

  const [left, right = ""] = normalizedIp.split("::");
  const leftParts = left ? left.split(":") : [];
  const rightParts = right ? right.split(":") : [];
  const missing = 8 - leftParts.length - rightParts.length;

  if (missing < 0) return null;

  return [
    ...leftParts,
    ...Array.from({ length: missing }, () => "0"),
    ...rightParts,
  ].map((part) => part.padStart(4, "0"));
}

function isPrivateIpv6(ip) {
  const normalizedIp = normalizeHostname(ip);
  const expanded = expandIpv6(normalizedIp);

  if (!expanded) return true;

  const first = Number.parseInt(expanded[0], 16);

  return (
    normalizedIp === "::" ||
    normalizedIp === "::1" ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80
  );
}

export function isBlockedHostname(hostname) {
  const normalizedHostname = normalizeHostname(hostname);

  if (!normalizedHostname) return true;
  if (INTERNAL_HOSTNAMES.has(normalizedHostname)) return true;
  if (normalizedHostname.endsWith(".localhost")) return true;

  const ipVersion = net.isIP(normalizedHostname);
  if (ipVersion === 4) return isPrivateIpv4(normalizedHostname);
  if (ipVersion === 6) return isPrivateIpv6(normalizedHostname);

  return false;
}

export function validateUrlSyntax(rawUrl) {
  const parsedUrl = new URL(rawUrl);

  if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    return {
      ok: false,
      url: null,
      reason: "Format URL tidak didukung.",
    };
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return {
      ok: false,
      url: null,
      reason: "URL lokal atau privat tidak dapat diperiksa.",
    };
  }

  return {
    ok: true,
    url: parsedUrl,
    reason: null,
  };
}

export async function assertPublicUrl(rawUrl) {
  const syntaxResult = validateUrlSyntax(rawUrl);

  if (!syntaxResult.ok) {
    throw new Error(syntaxResult.reason);
  }

  const parsedUrl = syntaxResult.url;
  const hostname = normalizeHostname(parsedUrl.hostname);

  if (net.isIP(hostname)) {
    return parsedUrl;
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });

  if (
    addresses.length === 0 ||
    addresses.some((address) => isBlockedHostname(address.address))
  ) {
    throw new Error("URL mengarah ke alamat privat atau internal.");
  }

  return parsedUrl;
}

export function safeLookup(hostname, options, callback) {
  dns
    .lookup(hostname, options)
    .then((result) => {
      const addresses = Array.isArray(result) ? result : [result];

      if (addresses.some((address) => isBlockedHostname(address.address))) {
        callback(new Error("Hostname mengarah ke alamat privat atau internal."));
        return;
      }

      if (options?.all) {
        callback(null, result);
        return;
      }

      callback(null, result.address, result.family);
    })
    .catch((error) => callback(error));
}

export function resolveRedirectUrl(location, currentUrl) {
  return new URL(location, currentUrl).toString();
}
