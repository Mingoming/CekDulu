"use client";

import { useRef, useState } from "react";
import Disclaimer from "@/components/Disclaimer";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Header from "@/components/Header";
import InfoTabs from "@/components/InfoTabs";
import InputBox from "@/components/InputBox";
import LoadingState from "@/components/LoadingState";
import ResultCard from "@/components/ResultCard";

const MAX_INPUT_LENGTH = 6000;
const REQUEST_TIMEOUT_MS = 30000;

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
    text: "Pemerintah bagi-bagi bantuan sosial tunai 5 juta rupiah untuk semua pengguna WhatsApp. Buruan cek nama Anda di link ini sekarang sebelum ditutup: http://bit.ly/bansos-darurat-2026. Share ke grup lain agar kebagian!",
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

export default function HomePage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef(null);

  function handleTextChange(nextText) {
    setText(nextText);
    setError("");
    setResult(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError("Silakan tempel berita, chat, atau link terlebih dahulu.");
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

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Terjadi kesalahan saat memeriksa pesan."
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-[15px] py-5 sm:py-7">
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5 pb-10">
        <Header />

        <section className="rounded-[20px] bg-white p-6 shadow-[0_10px_15px_-3px_rgba(15,23,42,0.05),0_4px_6px_-4px_rgba(15,23,42,0.05)] sm:p-7">
          <InfoTabs />
          <p className="mb-5 text-center text-lg leading-relaxed text-slate-600 sm:text-xl">
            Khawatir pesan WhatsApp, berita, atau link yang Anda terima
            mencurigakan? Tempel teks atau link di bawah ini untuk memeriksa
            tanda-tandanya.
          </p>

          <InputBox
            value={text}
            onChange={handleTextChange}
            onSubmit={handleSubmit}
            disabled={isLoading}
            examples={exampleInputs}
            maxLength={MAX_INPUT_LENGTH}
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
