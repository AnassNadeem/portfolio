import { useEffect, useState } from "react";
import { gsap } from "../lib/gsap";
import { useApp } from "../context/AppContext";
import { emit as busEmit } from "../lib/bus";
import { driver } from "../data/portfolio";

const CAR = String.raw`
        ______
   ____//_||__\\_____
  /_- APEX  ${driver.number}  -_\===D
 (o)============(o)
`;

/**
 * For the engineers who open DevTools (we know you're here):
 * console art, cheat codes, magnetic buttons, overdrive mode.
 */
export default function EasterEggs() {
  const { toggleCam, unlockGold, scrollTo, reduced } = useApp();
  const [overdrive, setOverdrive] = useState(false);

  // styled console greeting + hints
  useEffect(() => {
    console.log(
      `%c${CAR}\n%cP1 CANDIDATE DETECTED.%c\n\nYou opened the toolbox — respect. Try typing these anywhere on the page:\n\n  drs      → overtake mode (8s of pure speed)\n  boxbox   → pit stop, live tyre swap\n  onboard  → halo-cam view\n  gold     → champion livery, no questions asked\n\n⌘K opens race control. The arcade keeps score.\nLet's build something fast: ${driver.email}`,
      "color:#e10600; font-weight:bold; font-family:monospace",
      "color:#f5f5f7; font-size:14px; font-weight:900; font-style:italic",
      "color:#9ba1a6; font-size:12px"
    );
  }, []);

  // cheat-code key buffer
  useEffect(() => {
    let buffer = "";
    let timer = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.("input, textarea, select")) return;
      if (e.key.length !== 1) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        buffer = "";
      }, 1600);
      buffer = (buffer + e.key.toLowerCase()).slice(-8);

      if (buffer.endsWith("drs")) {
        buffer = "";
        setOverdrive(true);
        busEmit("overdrive", true);
        busEmit("toast", { text: "OVERTAKE MODE — DRS OPEN ▸▸", tone: "accent" });
        document.documentElement.classList.add("overdrive");
        window.setTimeout(() => {
          setOverdrive(false);
          busEmit("overdrive", false);
          document.documentElement.classList.remove("overdrive");
        }, 8000);
      } else if (buffer.endsWith("boxbox")) {
        buffer = "";
        scrollTo(0);
        window.setTimeout(() => busEmit("pitstop"), 950);
      } else if (buffer.endsWith("onboard")) {
        buffer = "";
        toggleCam();
        scrollTo(0);
        busEmit("toast", { text: "CAMERA — ONBOARD TOGGLED", tone: "plain" });
      } else if (buffer.endsWith("gold")) {
        buffer = "";
        unlockGold();
        busEmit("toast", { text: "🏆 CHAMPION GOLD UNLOCKED — CHECK THE LIVERY SWATCHES", tone: "green" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [toggleCam, unlockGold, scrollTo]);

  // magnetic buttons: every .btn leans toward the cursor
  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const onOver = (e: PointerEvent) => {
      const btn = (e.target as Element | null)?.closest?.(".btn") as HTMLElement | null;
      if (!btn || btn.dataset.magnetic) return;
      btn.dataset.magnetic = "1";
      const move = (ev: PointerEvent) => {
        const r = btn.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        gsap.to(btn, { "--mx": `${dx * 0.16}px`, "--my": `${dy * 0.3}px`, duration: 0.3, ease: "power2.out" });
      };
      const leave = () => {
        btn.removeEventListener("pointermove", move);
        btn.removeEventListener("pointerleave", leave);
        delete btn.dataset.magnetic;
        gsap.to(btn, { "--mx": "0px", "--my": "0px", duration: 0.55, ease: "elastic.out(1.1, 0.4)" });
      };
      btn.addEventListener("pointermove", move);
      btn.addEventListener("pointerleave", leave);
    };
    document.addEventListener("pointerover", onOver);
    return () => document.removeEventListener("pointerover", onOver);
  }, [reduced]);

  if (!overdrive) return null;
  return <div className="overdrive-fx" aria-hidden="true" />;
}
