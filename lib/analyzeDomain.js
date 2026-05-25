const shortlinkDomains = new Set([
  "bit.ly",
  "tinyurl.com",
  "shortlink",
  "s.id",
  "cutt.ly",
  "rebrand.ly",
  "t.co",
  "goo.gl",
  "ow.ly",
]);

const suspiciousKeywords = [
  "gratis",
  "hadiah",
  "bonus",
  "bansos",
  "claim",
  "klaim",
  "promo",
  "secure-login",
  "verifikasi",
];

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isIpAddress(hostname) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function analyzeDomain(url) {
  const parsedUrl = new URL(url);
  const domain = getHostname(url);
  const signals = [];

  if (shortlinkDomains.has(domain)) {
    signals.push({
      id: "domain_shortlink",
      label: "Shortlink terdeteksi",
      score: 15,
      reason:
        "Link memakai layanan pemendek URL sehingga alamat tujuan sebenarnya tidak langsung terlihat.",
    });
  }

  if (parsedUrl.protocol !== "https:") {
    signals.push({
      id: "domain_not_https",
      label: "Tidak memakai HTTPS",
      score: 10,
      reason:
        "Link tidak memakai HTTPS, sehingga perlu lebih hati-hati sebelum membuka atau mengisi data.",
    });
  }

  const hasSuspiciousKeyword = suspiciousKeywords.some((keyword) =>
    domain.includes(keyword)
  );
  const hasManyHyphens = (domain.match(/-/g) || []).length >= 3;
  const hasManySubdomains = domain.split(".").length >= 4;

  if (hasSuspiciousKeyword || hasManyHyphens || hasManySubdomains || isIpAddress(domain)) {
    signals.push({
      id: "domain_suspicious_pattern",
      label: "Pola domain perlu dicek",
      score: 15,
      reason:
        "Domain memiliki pola yang perlu diperiksa, seperti kata promosi, terlalu banyak subdomain, banyak tanda hubung, atau alamat IP langsung.",
    });
  }

  const score = Math.min(
    signals.reduce((total, signal) => total + signal.score, 0),
    40
  );

  return {
    domain,
    isHttps: parsedUrl.protocol === "https:",
    isShortlink: shortlinkDomains.has(domain),
    signals,
    score,
  };
}
