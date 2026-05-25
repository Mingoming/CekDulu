"use client";

import { useRef, useState } from "react";
import Disclaimer from "@/components/Disclaimer";
import ErrorState from "@/components/ErrorState";
import Header from "@/components/Header";
import InputBox from "@/components/InputBox";
import LoadingState from "@/components/LoadingState";
import ResultCard from "@/components/ResultCard";

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

export default function HomePage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError("Silakan tempel berita, chat, atau link terlebih dahulu.");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Analisis belum berhasil dilakukan.");
      }

      setResult(data);
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Terjadi kesalahan saat memeriksa pesan."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-[15px] py-5 sm:py-7">
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5 pb-10">
        <Header />

        <section className="rounded-[20px] bg-white p-6 shadow-[0_10px_15px_-3px_rgba(15,23,42,0.05),0_4px_6px_-4px_rgba(15,23,42,0.05)] sm:p-7">
          <div className="mb-5 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-600">
            <div className="border-r border-slate-200 px-2 py-2.5">Chat</div>
            <div className="border-r border-slate-200 px-2 py-2.5">Berita</div>
            <div className="px-2 py-2.5">Link</div>
          </div>
          <p className="mb-5 text-center text-lg leading-relaxed text-slate-600 sm:text-xl">
            Khawatir pesan di WhatsApp atau berita yang Anda terima itu
            palsu/hoax? Tempel teks atau link di bawah ini untuk memeriksa
            cirinya.
          </p>

          <InputBox
            value={text}
            onChange={setText}
            onSubmit={handleSubmit}
            disabled={isLoading}
            examples={exampleInputs}
          />
        </section>

        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} /> : null}

        <div ref={resultRef}>{result ? <ResultCard result={result} /> : null}</div>

        <Disclaimer />
      </div>
    </main>
  );
}
