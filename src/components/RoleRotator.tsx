import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import { driver } from "../data/portfolio";
import "./RoleRotator.css";

type Props = {
  ready?: boolean;
  reduced?: boolean;
};

export default function RoleRotator({ ready = true, reduced = false }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!ready || reduced || !ref.current) return;
    const el = ref.current;
    const roles = driver.roles;
    let tween: gsap.core.Tween | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    const cycle = () => {
      indexRef.current = (indexRef.current + 1) % roles.length;
      const next = roles[indexRef.current];
      tween?.kill();
      tween = gsap.to(el, {
        opacity: 0,
        y: -8,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          el.textContent = next;
          gsap.fromTo(
            el,
            { opacity: 0, y: 12, fontVariationSettings: '"wght" 400' },
            {
              opacity: 1,
              y: 0,
              fontVariationSettings: '"wght" 700',
              duration: 0.55,
              ease: "power3.out",
            }
          );
        },
      });
    };

    el.textContent = roles[0];
    gsap.fromTo(
      el,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.2 }
    );

    timer = setInterval(cycle, 3200);
    return () => {
      tween?.kill();
      if (timer) clearInterval(timer);
    };
  }, [ready, reduced]);

  return (
    <p className="role-rotator" ref={ref} aria-live="polite">
      {driver.roles[0]}
    </p>
  );
}
