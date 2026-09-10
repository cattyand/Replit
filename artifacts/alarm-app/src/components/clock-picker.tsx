import { useEffect, useRef, useState } from "react";

interface ClockPickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

const ITEM_H  = 56;  // px per voce — non toccare per non cambiare il font
const VISIBLE = 3;   // voci visibili (1 sopra + selezionata + 1 sotto)

function Drum({
  total,
  value,
  onChange,
}: {
  total: number;
  value: number;
  onChange: (n: number) => void;
}) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const snapTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipEffect = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /* Scroll iniziale senza animazione */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: value * ITEM_H, behavior: "instant" as ScrollBehavior });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Aggiornamento esterno del valore → scroll fluido */
  useEffect(() => {
    if (skipEffect.current) { skipEffect.current = false; return; }
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: value * ITEM_H, behavior: "smooth" });
  }, [value]);

  /* Snap dopo scorrimento libero */
  const handleScroll = () => {
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(total - 1, Math.round(el.scrollTop / ITEM_H)));
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      if (idx !== value) {
        skipEffect.current = true;
        onChange(idx);
      }
    }, 100);
  };

  /* Click su qualsiasi voce: seleziona subito e apre l'input */
  const handleItemClick = (i: number) => {
    if (editing) return;
    // Se non è già selezionato, spostati prima poi apri editing
    if (i !== value) {
      scrollRef.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
      skipEffect.current = true;
      onChange(i);
    }
    setDraft(String(i).padStart(2, "0"));
    setEditing(true);
    // Piccolo delay per attendere il re-render con l'input montato
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
  };

  const commitEdit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n)) {
      const clamped = Math.max(0, Math.min(total - 1, n));
      skipEffect.current = true;
      onChange(clamped);
      scrollRef.current?.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
    }
    setEditing(false);
  };

  const BG = "hsl(var(--card))";
  const FADE = ITEM_H * 1; // sfumatura alta 1 voce (VISIBLE=3)

  return (
    <div className="relative select-none" style={{ width: 76, height: ITEM_H * VISIBLE }}>

      {/* Sfumatura superiore */}
      <div className="absolute inset-x-0 top-0 z-20 pointer-events-none" style={{
        height: FADE,
        background: `linear-gradient(to bottom, ${BG} 15%, transparent)`,
      }} />

      {/* Banda di selezione */}
      <div className="absolute inset-x-1 z-10 pointer-events-none rounded-xl bg-primary/10 border border-primary/25" style={{
        top: ITEM_H * Math.floor(VISIBLE / 2),
        height: ITEM_H,
      }} />

      {/* Sfumatura inferiore */}
      <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none" style={{
        height: FADE,
        background: `linear-gradient(to top, ${BG} 15%, transparent)`,
      }} />

      {/* Lista scorrevole */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="[&::-webkit-scrollbar]:hidden"
        style={{
          height: "100%",
          overflowY: "scroll",
          scrollbarWidth: "none",
          scrollSnapType: "y mandatory",
          paddingTop:    ITEM_H * Math.floor(VISIBLE / 2),
          paddingBottom: ITEM_H * Math.floor(VISIBLE / 2),
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            onClick={() => handleItemClick(i)}
            className={`flex items-center justify-center cursor-pointer transition-all duration-100 text-[1.6rem] leading-none font-mono font-semibold ${
              i === value
                ? "text-primary"
                : "text-muted-foreground/35 hover:text-muted-foreground/60"
            }`}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
          >
            {editing && i === value ? (
              <input
                ref={inputRef}
                value={draft}
                maxLength={2}
                onChange={e => setDraft(e.target.value.replace(/\D/g, ""))}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === "Enter")     { commitEdit(); }
                  if (e.key === "Escape")    { setEditing(false); }
                  if (e.key === "ArrowUp")   { e.preventDefault(); setDraft(d => String(Math.max(0, parseInt(d || "0", 10) - 1)).padStart(2, "0")); }
                  if (e.key === "ArrowDown") { e.preventDefault(); setDraft(d => String(Math.min(total - 1, parseInt(d || "0", 10) + 1)).padStart(2, "0")); }
                }}
                className="w-14 text-center bg-transparent border-b-2 border-primary outline-none text-[1.6rem] font-mono font-semibold text-primary"
              />
            ) : (
              String(i).padStart(2, "0")
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClockPicker({ hour, minute, onChange }: ClockPickerProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card border border-border/70 shadow-inner px-6 py-2">
      <Drum total={24} value={hour}   onChange={h => onChange(h, minute)} />
      <span className="text-4xl font-light text-muted-foreground/60 pb-0.5 select-none">:</span>
      <Drum total={60} value={minute} onChange={m => onChange(hour, m)} />
    </div>
  );
}
