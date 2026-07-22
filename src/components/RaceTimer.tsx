import { useEffect } from "react";
import { gsap } from "../lib/gsap";
import { useApp } from "../context/AppContext";
import { emit as busEmit, on as busOn } from "../lib/bus";

/**
 * Renderless lap timer. The lap starts on the first scroll after lights-out,
 * splits at three sector boundaries, and finishes at the checkered line
 * (98.5% of the page). Scrolling back to the top re-arms a fresh lap.
 * Sector + lap PBs persist in localStorage; splits flash green/purple.
 */
export default function RaceTimer() {
  const { ready, reduced } = useApp();

  useEffect(() => {
    if (!ready || reduced) return;

    let bounds: number[] = [];
    const measure = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const at = (id: string) => {
        const el = document.getElementById(id);
        return el ? Math.min(1, (el.offsetTop - innerHeight * 0.5) / max) : 1;
      };
      // S1 → experience, S2 → skills, S3 → finish line
      bounds = [at("experience"), at("skills"), 0.985];
    };
    measure();
    let rT: number | undefined;
    const onResize = () => {
      window.clearTimeout(rT);
      rT = window.setTimeout(measure, 300);
    };
    window.addEventListener("resize", onResize);

    let running = false;
    let done = false;
    // Must visit the grid (top) before a lap can start — prevents false starts
    // when teleporting/scrolling up from the footer after "Start Flying Lap".
    let armed = window.scrollY < 8;
    let startT = 0;
    let lastSplitT = 0;
    let sectorIdx = 0;
    // ghost trace: progress samples over time, saved on personal bests
    let trace: { t: number; p: number }[] = [];
    let lastSampleT = 0;

    const reset = () => {
      running = false;
      done = false;
      armed = false;
      sectorIdx = 0;
      trace = [];
    };
    const offReset = busOn("lapReset", () => reset());

    const pbKey = (k: string) => `apex_pb_${k}`;
    const getPb = (k: string): number | null => {
      const v = localStorage.getItem(pbKey(k));
      return v ? Number(v) : null;
    };
    const setPb = (k: string, ms: number) => {
      try {
        localStorage.setItem(pbKey(k), String(ms));
      } catch {
        /* fine */
      }
    };

    const tick = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max <= 0) return;
      const p = window.scrollY / max;

      // back on the grid → re-arm (after finish, or after lapReset from mid-page)
      if (p < 0.01) {
        if (done) reset();
        armed = true;
      }

      if (armed && !running && !done && p > 0.012) {
        running = true;
        armed = false;
        startT = performance.now();
        lastSplitT = startT;
        sectorIdx = 0;
        trace = [{ t: 0, p }];
        lastSampleT = startT;
        busEmit("lapStart");
      }

      if (!running) return;

      // sample the lap for the ghost replay (~6 Hz, capped)
      const nowT = performance.now();
      if (nowT - lastSampleT > 160 && trace.length < 1200) {
        trace.push({ t: nowT - startT, p });
        lastSampleT = nowT;
      }

      if (sectorIdx < bounds.length && p >= bounds[sectorIdx]) {
        const now = performance.now();
        const split = now - lastSplitT;
        lastSplitT = now;
        const idx = sectorIdx + 1;
        sectorIdx++;

        const key = `s${idx}`;
        const pb = getPb(key);
        let kind: "purple" | "green" | "plain" = "plain";
        if (pb === null || split < pb) {
          kind = "purple";
          setPb(key, split);
        } else if (split < pb * 1.12) {
          kind = "green";
        }

        if (idx < 3) {
          busEmit("sector", { idx, ms: split, kind });
        } else {
          // checkered flag
          running = false;
          done = true;
          const total = performance.now() - startT;
          const lapPb = getPb("lap");
          const isPb = lapPb === null || total < lapPb;
          if (isPb) {
            setPb("lap", total);
            // best lap becomes the ghost for next time
            trace.push({ t: total, p: 1 });
            try {
              localStorage.setItem("apex_ghost", JSON.stringify({ ms: total, trace }));
            } catch {
              /* fine */
            }
          }
          busEmit("sector", { idx, ms: split, kind });
          busEmit("finish", { ms: total, pb: isPb });
        }
      }
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(rT);
      offReset();
    };
  }, [ready, reduced]);

  return null;
}
