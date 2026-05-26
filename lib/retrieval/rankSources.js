const DISPLAY_COUNT = 3;

const factCheckingDomains = [
  "turnbackhoax.id",
  "cekfakta.com",
  "kominfo.go.id",
  "cekfakta.tempo.co",
  "cekfakta.liputan6.com",
];

const officialDomains = [
  "go.id",
  "who.int",
  "unicef.org",
  "ojk.go.id",
  "bi.go.id",
  "kemenkes.go.id",
  "kemkes.go.id",
  "polri.go.id",
  "bmkg.go.id",
];

const credibleMediaDomains = [
  "antaranews.com",
  "kompas.com",
  "tempo.co",
  "detik.com",
  "cnnindonesia.com",
  "liputan6.com",
  "tirto.id",
  "katadata.co.id",
];

function isHttps(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function domainMatches(domain, candidates) {
  return candidates.some(
    (candidate) => domain === candidate || domain.endsWith(`.${candidate}`)
  );
}

function rankScore(source) {
  let score = 0;

  if (domainMatches(source.domain, officialDomains)) score += 40;
  if (domainMatches(source.domain, factCheckingDomains)) score += 35;
  if (domainMatches(source.domain, credibleMediaDomains)) score += 25;
  if (isHttps(source.url)) score += 10;
  if (source.title) score += 5;
  if (source.snippet) score += 5;

  return score;
}

export function rankSources(sources, limit = DISPLAY_COUNT) {
  const sourceMap = new Map();

  for (const source of sources) {
    if (!source?.url || sourceMap.has(source.url)) continue;
    sourceMap.set(source.url, {
      ...source,
      rankScore: rankScore(source),
    });
  }

  return [...sourceMap.values()]
    .sort((first, second) => second.rankScore - first.rankScore)
    .slice(0, limit)
    .map((source) => ({
      title: source.title,
      url: source.url,
      domain: source.domain,
      snippet: source.snippet,
    }));
}
