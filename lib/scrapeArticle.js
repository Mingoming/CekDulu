import http from "node:http";
import https from "node:https";
import axios from "axios";
import * as cheerio from "cheerio";
import { assertPublicUrl, resolveRedirectUrl, safeLookup } from "@/lib/safeUrl";

const SCRAPE_TIMEOUT_MS = 8000;
const MAX_ARTICLE_LENGTH = 8000;
const MAX_REDIRECTS = 3;
const SCRAPE_FALLBACK_MESSAGE =
  "Isi artikel belum bisa dibaca otomatis. CekDulu tetap memeriksa teks atau link yang Anda tempel.";
const httpAgent = new http.Agent({ lookup: safeLookup });
const httpsAgent = new https.Agent({ lookup: safeLookup });

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractArticleText($) {
  const selectors = [
    "article",
    "main",
    '[role="main"]',
    ".article-content",
    ".entry-content",
    ".post-content",
    ".content",
  ];

  for (const selector of selectors) {
    const text = cleanText($(selector).text());
    if (text.length > 300) return text.slice(0, MAX_ARTICLE_LENGTH);
  }

  const paragraphs = $("p")
    .map((_, element) => cleanText($(element).text()))
    .get()
    .filter((text) => text.length > 40)
    .join(" ");

  return cleanText(paragraphs).slice(0, MAX_ARTICLE_LENGTH);
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function fetchHtmlWithSafeRedirects(url) {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicUrl(currentUrl);

    const response = await axios.get(currentUrl, {
      timeout: SCRAPE_TIMEOUT_MS,
      maxContentLength: 1_500_000,
      maxBodyLength: 1_500_000,
      responseType: "text",
      maxRedirects: 0,
      httpAgent,
      httpsAgent,
      headers: {
        "User-Agent":
          "CekDuluBot/1.0 (+https://example.com; article preview for user safety)",
        Accept: "text/html,application/xhtml+xml",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;

      if (!location) {
        throw new Error("Redirect tidak memiliki tujuan yang jelas.");
      }

      if (redirectCount === MAX_REDIRECTS) {
        throw new Error("Terlalu banyak redirect saat membaca artikel.");
      }

      currentUrl = resolveRedirectUrl(location, currentUrl);
      await assertPublicUrl(currentUrl);
      continue;
    }

    return {
      response,
      finalUrl: currentUrl,
    };
  }

  throw new Error("Terlalu banyak redirect saat membaca artikel.");
}

export async function scrapeArticle(url) {
  const originalUrl = url;

  try {
    const { response, finalUrl } = await fetchHtmlWithSafeRedirects(url);

    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("text/html")) {
      throw new Error("Halaman bukan HTML.");
    }

    const $ = cheerio.load(response.data);
    $("script, style, noscript, svg, nav, footer, header, aside, form").remove();

    const title = cleanText(
      $('meta[property="og:title"]').attr("content") ||
        $("title").first().text() ||
        $("h1").first().text()
    );
    const description = cleanText(
      $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        ""
    );
    const articleText = extractArticleText($);

    if (!title && !description && articleText.length < 120) {
      throw new Error("Isi artikel tidak cukup untuk dibaca.");
    }

    return {
      ok: true,
      scrapeSuccess: true,
      title,
      description,
      articleText,
      domain: getDomain(finalUrl),
      originalUrl,
      finalUrl,
      error: null,
      errorReason: null,
    };
  } catch (error) {
    console.error("[scrapeArticle]", {
      url: originalUrl,
      message: error instanceof Error ? error.message : "unknown error",
    });

    return {
      ok: false,
      scrapeSuccess: false,
      title: "",
      description: "",
      articleText: "",
      domain: getDomain(originalUrl),
      originalUrl,
      finalUrl: originalUrl,
      error: SCRAPE_FALLBACK_MESSAGE,
      errorReason: SCRAPE_FALLBACK_MESSAGE,
    };
  }
}
