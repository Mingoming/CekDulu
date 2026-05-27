import { SparkIcon } from "@/components/Icons";

export default function Header() {
  return (
    <header className="my-7 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2563EB] text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)]">
        <SparkIcon className="h-7 w-7" />
      </div>
      <h1 className="font-lexend text-4xl font-black leading-none tracking-normal text-[#0F172A] sm:text-5xl">
        Cek<span className="text-[#2563EB]">Dulu</span>
      </h1>
      <p className="font-source mt-2 text-lg font-medium italic leading-relaxed text-slate-500 sm:text-xl">
        &quot;Cek dulu sebelum sebar.&quot;
      </p>
    </header>
  );
}
