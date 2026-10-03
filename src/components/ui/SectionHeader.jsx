function SectionHeader({ index, label, coords, dark = true, className = "" }) {
  const tone = dark ? "text-white/40" : "text-black/40";
  return (
    <div
      className={`pointer-events-none absolute left-6 right-6 top-6 z-30 flex justify-between font-mono text-[10px] tracking-[0.35em] md:left-10 md:right-10 md:top-10 ${tone} ${className}`}
    >
      <span>({String(index).padStart(2, "0")}) — {label}</span>
      {coords && <span>{coords}</span>}
    </div>
  );
}

export default SectionHeader;
