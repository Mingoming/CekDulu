const modes = [
  { id: "text", label: "Teks/Link" },
  { id: "screenshot", label: "Screenshot" },
];

export default function InputModeSelector({ value, onChange, disabled }) {
  return (
    <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
      {modes.map((mode) => {
        const isActive = value === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            className={`min-h-11 cursor-pointer rounded-lg px-3 py-2 text-base font-bold transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70 ${
              isActive
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
