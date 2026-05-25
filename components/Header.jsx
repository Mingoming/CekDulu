import { SparkIcon } from "@/components/Icons";

export default function Header() {
  return (
    <header className="my-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-[0_10px_20px_rgba(2,132,199,0.22)]">
        <SparkIcon className="h-7 w-7" />
      </div>
      <h1 className="text-[2.5rem] font-black leading-none tracking-normal text-sky-600 sm:text-5xl">
        CekDulu
      </h1>
      <p className="mt-2 text-xl font-medium italic leading-relaxed text-slate-500">
        &quot;Cek dulu sebelum sebar.&quot;
      </p>
    </header>
  );
}
