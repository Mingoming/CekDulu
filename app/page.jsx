"use client";

import { useEffect, useRef, useState } from "react";
import Disclaimer from "@/components/Disclaimer";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import ExtractedTextEditor from "@/components/ExtractedTextEditor";
import Header from "@/components/Header";
import ImagePreview from "@/components/ImagePreview";
import ImageUploadBox from "@/components/ImageUploadBox";
import InputModeSelector from "@/components/InputModeSelector";
import InputBox from "@/components/InputBox";
import LoadingState from "@/components/LoadingState";
import OcrLoadingState from "@/components/OcrLoadingState";
import ResultCard from "@/components/ResultCard";

const MAX_INPUT_LENGTH = 6000;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const SUPPORTED_SCREENSHOT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const OCR_FAILURE_MESSAGE =
  "Maaf, teks pada gambar belum terbaca jelas. Coba gunakan screenshot yang lebih terang atau salin teks secara manual.";

const exampleInputs = [
  {
    tone: "red",
    label: "Contoh Pesan Mencurigakan",
    description: "Kesehatan obat ajaib",
    text: "SEBARKAN!!! Rahasia besar dari Tiongkok, ramuan ini dijamin 100% berhasil menyembuhkan kanker tanpa dokter!! Cukup sekali minum sembuh total!! Media tidak berani menyiarkan ini karena pemerintah menutupi fakta sebenarnya!! Hati-hati darurat medis!!",
  },
  {
    tone: "yellow",
    label: "Contoh Pesan Perlu Dicek",
    description: "Bantuan sosial dan link pendek",
    text: "Saya mendapat pesan bahwa ada pendataan bantuan sosial untuk warga. Diminta mengecek nama penerima melalui https://bit.ly/cek-bansos-2026, tetapi pesan ini belum menyertakan sumber resmi yang jelas.",
  },
  {
    tone: "green",
    label: "Contoh Pesan Informasi Normal",
    description: "Berita resmi harian",
    text: "Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) mengimbau masyarakat untuk tetap waspada terhadap potensi hujan ringan di wilayah Jabodetabek pada sore hari ini. Informasi resmi dapat dipantau melalui aplikasi InfoBMKG atau situs resmi bmkg.go.id.",
  },
];

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getFriendlyErrorMessage(error) {
  if (!(error instanceof Error)) {
    return "Terjadi kesalahan saat memeriksa pesan. Coba lagi sebentar lagi.";
  }

  const allowedMessages = [
    "Teks tidak boleh kosong.",
    "Format permintaan tidak valid.",
    "Maaf, analisis AI sedang tidak tersedia. Kami tetap menampilkan hasil pemeriksaan dasar.",
  ];

  if (
    allowedMessages.includes(error.message) ||
    error.message.startsWith("Teks terlalu panjang.")
  ) {
    return error.message;
  }

  return "Terjadi kesalahan saat memeriksa pesan. Coba lagi sebentar lagi.";
}

export default function HomePage() {
  const [inputMode, setInputMode] = useState("text");
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [hasOcrText, setHasOcrText] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const resultRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function handleTextChange(nextText) {
    setText(nextText);
    setError("");
    setResult(null);

    if (inputMode === "text") {
      setHasOcrText(false);
    }
  }

  function handleModeChange(nextMode) {
    if (inputMode === "screenshot" && nextMode === "text") {
      clearImagePreview();
      setIsOcrLoading(false);

      if (hasOcrText) {
        setText("");
        setHasOcrText(false);
      }
    }

    setInputMode(nextMode);
    setError("");
    setResult(null);
  }

  function clearImagePreview() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImagePreviewUrl("");
    setImageFileName("");
  }

  function clearScreenshotState() {
    clearImagePreview();

    if (hasOcrText) {
      setText("");
      setHasOcrText(false);
    }
  }

  async function handleScreenshotSelect(file) {
    setError("");
    setResult(null);
    setText("");
    setHasOcrText(false);
    clearImagePreview();

    if (!SUPPORTED_SCREENSHOT_TYPES.has(file.type)) {
      setError("Format gambar belum didukung. Gunakan JPG, PNG, atau WEBP.");
      return;
    }

    if (file.size > MAX_SCREENSHOT_SIZE) {
      setError("Ukuran gambar terlalu besar. Maksimal 5MB.");
      return;
    }

    setImagePreviewUrl(URL.createObjectURL(file));
    setImageFileName(file.name);
    setIsOcrLoading(true);

    try {
      const { extractTextFromImage } = await import("@/lib/extractTextFromImage");
      const extractedText = await extractTextFromImage(file);

      if (!extractedText || extractedText.length < 8) {
        setText("");
        setHasOcrText(false);
        setError(OCR_FAILURE_MESSAGE);
        return;
      }

      setText(extractedText);
      setHasOcrText(true);
    } catch (ocrError) {
      console.error("[ocr]", ocrError);
      setText("");
      setHasOcrText(false);
      setError(OCR_FAILURE_MESSAGE);
    } finally {
      setIsOcrLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError(
        inputMode === "screenshot"
          ? "Silakan upload screenshot atau isi teks hasil OCR terlebih dahulu."
          : "Silakan tempel berita, chat, atau link terlebih dahulu."
      );
      setResult(null);
      return;
    }

    if (trimmedText.length > MAX_INPUT_LENGTH) {
      setError(`Teks terlalu panjang. Batasi maksimal ${MAX_INPUT_LENGTH} karakter.`);
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmedText }),
        signal: controller.signal,
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Terjadi kesalahan saat memeriksa pesan.");
      }

      if (!data) {
        throw new Error("Terjadi kesalahan saat memeriksa pesan.");
      }

      setResult(data);
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.name === "AbortError") {
        setError("Koneksi AI sedang lambat. Coba lagi sebentar lagi.");
        return;
      }

      setError(getFriendlyErrorMessage(caughtError));
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-10">
        <Header />

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-7">
          <InputModeSelector
            value={inputMode}
            onChange={handleModeChange}
            disabled={isLoading || isOcrLoading}
          />
          <p className="font-source mb-5 text-center text-lg leading-relaxed text-slate-600 sm:text-xl">
            Khawatir pesan WhatsApp, berita, atau link yang Anda terima
            mencurigakan? Tempel teks, link, atau upload screenshot untuk
            memeriksa tanda-tandanya.
          </p>

          {inputMode === "screenshot" ? (
            <div className="mb-5 space-y-4">
              <ImageUploadBox
                onFileSelect={handleScreenshotSelect}
                disabled={isLoading || isOcrLoading}
              />
              <ImagePreview
                imageUrl={imagePreviewUrl}
                fileName={imageFileName}
                onClear={clearScreenshotState}
                disabled={isLoading || isOcrLoading}
              />
              {isOcrLoading ? <OcrLoadingState /> : null}
              <ExtractedTextEditor hasText={hasOcrText && Boolean(text.trim())} />
            </div>
          ) : null}

          <InputBox
            value={text}
            onChange={handleTextChange}
            onSubmit={handleSubmit}
            disabled={isLoading || isOcrLoading}
            examples={exampleInputs}
            maxLength={MAX_INPUT_LENGTH}
            label={
              inputMode === "screenshot"
                ? "Edit teks hasil OCR di sini:"
                : "Tempel pesan, chat, atau link di sini:"
            }
            placeholder={
              inputMode === "screenshot"
                ? "Teks dari screenshot akan muncul di sini. Anda bisa mengeditnya sebelum dicek..."
                : "Contoh: tempel chat WhatsApp, judul berita, caption, atau link yang ingin dicek..."
            }
            showExamples={inputMode === "text"}
            disabledLabel={
              isOcrLoading ? "Tunggu OCR Selesai" : "Sedang Mengecek..."
            }
          />
        </section>

        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} /> : null}

        <div ref={resultRef}>
          {result ? <ResultCard result={result} /> : null}
        </div>

        {!isLoading && !error && !result ? <EmptyState /> : null}

        <Disclaimer />
      </div>
    </main>
  );
}
