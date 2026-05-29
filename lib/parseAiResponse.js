export function parseAiResponse(content) {
  if (!content) return null;

  const candidates = [
    content,
    stripMarkdownFence(content),
    extractJsonObject(content),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);

    if (parsed) {
      return parsed;
    }
  }

  return parsePartialAnalysis(content);
}

function parseJsonCandidate(value) {
  const normalizedValue = normalizeJsonLikeText(value);
  const candidates = [
    normalizedValue,
    normalizedValue.replace(/,\s*([}\]])/g, "$1"),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      // Try the next normalization candidate.
    }
  }

  return null;
}

function normalizeJsonLikeText(value) {
  return value
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function stripMarkdownFence(value) {
  const trimmedValue = value.trim();
  const fenceMatch = trimmedValue.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenceMatch?.[1] || "";
}

function extractJsonObject(value) {
  const startIndex = value.indexOf("{");
  if (startIndex === -1) return "";

  let depth = 0;
  let isInsideString = false;
  let isEscaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      isInsideString = !isInsideString;
      continue;
    }

    if (isInsideString) continue;

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return value.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

function parsePartialAnalysis(content) {
  const source = stripMarkdownFence(content) || content;
  const partial = {};
  const stringFields = [
    "summary",
    "mainClaim",
    "riskLevel",
    "simpleExplanation",
    "sourceComparison",
    "recommendedAction",
    "sourceDomain",
  ];

  for (const field of stringFields) {
    const value = extractStringField(source, field);

    if (value) {
      partial[field] = value;
    }
  }

  const suspiciousReasons = extractStringArrayField(source, "suspiciousReasons");
  if (suspiciousReasons.length > 0) {
    partial.suspiciousReasons = suspiciousReasons;
  }

  return Object.keys(partial).length > 0 ? partial : null;
}

function extractStringField(source, field) {
  const fieldPattern = new RegExp(`"${field}"\\s*:\\s*"`, "i");
  const match = fieldPattern.exec(source);
  if (!match) return "";

  return readJsonStringFrom(source, match.index + match[0].length);
}

function readJsonStringFrom(source, startIndex) {
  let value = "";
  let isEscaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (isEscaped) {
      value += `\\${char}`;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      return decodeJsonString(value);
    }

    value += char;
  }

  return "";
}

function decodeJsonString(value) {
  try {
    return JSON.parse(`"${value}"`).trim();
  } catch {
    return value.replace(/\s+/g, " ").trim();
  }
}

function extractStringArrayField(source, field) {
  const fieldPattern = new RegExp(`"${field}"\\s*:\\s*\\[`, "i");
  const match = fieldPattern.exec(source);
  if (!match) return [];

  const values = [];
  let index = match.index + match[0].length;

  while (index < source.length) {
    const char = source[index];

    if (char === "]") break;

    if (char === '"') {
      const value = readJsonStringFrom(source, index + 1);
      if (!value) break;
      values.push(value);
      index += value.length + 2;
      continue;
    }

    index += 1;
  }

  return values;
}
