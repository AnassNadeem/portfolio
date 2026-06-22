import "./Marquee.css";

/** Infinite ticker — outlined italic display type with accent separators */
export default function Marquee({ items, accent = false }: { items: string[]; accent?: boolean }) {
  const row = (
    <>
      {items.map((t, i) => (
        <span className="mq-item" key={i}>
          <span className={accent ? "mq-text mq-text--solid" : "mq-text"}>{t}</span>
          <svg className="mq-flag" viewBox="0 0 16 16" aria-hidden="true">
            <rect width="8" height="8" fill="currentColor" />
            <rect x="8" y="8" width="8" height="8" fill="currentColor" />
          </svg>
        </span>
      ))}
    </>
  );

  return (
    <div className={`marquee ${accent ? "marquee--accent" : ""}`} aria-hidden="true">
      <div className="mq-track">
        <div className="mq-row">{row}</div>
        <div className="mq-row">{row}</div>
      </div>
    </div>
  );
}
