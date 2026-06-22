import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: TurnstileOpts) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

type TurnstileOpts = {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
};

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire: () => void;
  resetKey?: number;
};

export default function TurnstileWidget({ siteKey, onToken, onExpire, resetKey = 0 }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!divRef.current || !siteKey) return;

    const opts: TurnstileOpts = {
      sitekey: siteKey,
      theme: "dark",
      callback: onToken,
      "error-callback": onExpire,
      "expired-callback": onExpire,
    };

    const render = () => {
      if (!divRef.current || !window.turnstile) return;
      // Clean up previous render before re-rendering (e.g. on resetKey change)
      if (widgetId.current) {
        try { window.turnstile.remove(widgetId.current); } catch { /* fine */ }
      }
      widgetId.current = window.turnstile.render(divRef.current, opts);
    };

    if (window.turnstile) {
      render();
    } else {
      // Poll until the Turnstile script (loaded in index.html) is ready
      const poll = window.setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          render();
        }
      }, 80);
      return () => {
        clearInterval(poll);
        if (widgetId.current && window.turnstile) {
          try { window.turnstile.remove(widgetId.current); } catch { /* fine */ }
        }
      };
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* fine */ }
      }
    };
  // resetKey triggers a fresh render so the challenge resets after an error
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, resetKey]);

  return <div ref={divRef} style={{ margin: "12px 0" }} />;
}
