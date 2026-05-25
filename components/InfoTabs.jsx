const items = ["Chat", "Berita", "Link"];

export default function InfoTabs() {
  return (
    <div className="mb-5 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-600">
      {items.map((item, index) => (
        <div
          key={item}
          className={`px-2 py-2.5 ${index < items.length - 1 ? "border-r border-slate-200" : ""}`}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
