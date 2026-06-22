/** Cached WebGL availability check — run once, reuse everywhere. */
let _result: boolean | null = null;

export function supportsWebGL(): boolean {
  if (_result !== null) return _result;
  if (typeof window === "undefined") return (_result = false);
  try {
    const c = document.createElement("canvas");
    _result = !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    _result = false;
  }
  return _result;
}
