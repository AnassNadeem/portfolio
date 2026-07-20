import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "../lib/gsap";
import { useApp } from "../context/AppContext";

type Props = {
  sector: string; // "01"
  kicker: string; // "WHO I AM"
  title: string;  // "DRIVER PROFILE"
};

export default function SectionHeader({ sector, kicker, title }: Props) {
  const { reduced } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced) return;
      const titleEl = rootRef.current!.querySelector(".title")!;
      const split = SplitText.create(titleEl, { type: "chars" });
      gsap.from(split.chars, {
        yPercent: 115,
        rotate: 4,
        stagger: 0.022,
        duration: 0.8,
        ease: "power4.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 82%", once: true },
      });
      gsap.from(rootRef.current!.querySelector(".eyebrow"), {
        opacity: 0,
        x: -24,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 82%", once: true },
      });
    },
    { scope: rootRef }
  );

  return (
    <div className="sec-head" ref={rootRef}>
      <div className="sec-ghost" aria-hidden="true">{sector}</div>
      <div className="eyebrow mono">
        <span className="slash" />
        <span>
          SECTOR {sector} · {kicker}
        </span>
        <span className="rule" />
      </div>
      <h2 className="title display" style={{ overflow: "hidden" }}>
        {title}
        <span className="text-accent">.</span>
      </h2>
    </div>
  );
}
