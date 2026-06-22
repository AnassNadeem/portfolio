import { describe, it, expect, vi, beforeEach } from "vitest";

// Reset module cache between tests (the util caches its result in module scope)
beforeEach(() => {
  vi.resetModules();
});

describe("supportsWebGL", () => {
  it("returns true when WebGLRenderingContext is available", async () => {
    const mockContext = {};
    const getContext = vi.fn().mockReturnValue(mockContext);
    vi.spyOn(document, "createElement").mockReturnValue({ getContext } as unknown as HTMLCanvasElement);
    Object.defineProperty(window, "WebGLRenderingContext", { value: {}, configurable: true });

    const { supportsWebGL } = await import("../lib/webgl");
    expect(supportsWebGL()).toBe(true);
  });

  it("returns false when getContext throws", async () => {
    const getContext = vi.fn().mockImplementation(() => { throw new Error("no webgl"); });
    vi.spyOn(document, "createElement").mockReturnValue({ getContext } as unknown as HTMLCanvasElement);
    Object.defineProperty(window, "WebGLRenderingContext", { value: {}, configurable: true });

    const { supportsWebGL } = await import("../lib/webgl");
    expect(supportsWebGL()).toBe(false);
  });

  it("returns false when WebGLRenderingContext is undefined", async () => {
    Object.defineProperty(window, "WebGLRenderingContext", { value: undefined, configurable: true });
    const { supportsWebGL } = await import("../lib/webgl");
    expect(supportsWebGL()).toBe(false);
  });
});
