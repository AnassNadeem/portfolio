/** Tiny typed event bus — lets the 3D scenes, HUD, games and overlays talk
 *  without prop-drilling through React. */

export type BusEvents = {
  /** racing-line path computed/recomputed — normalized points for the minimap */
  path: { points: { x: number; y: number }[] };
  /** DRS zone entered/left at speed */
  drs: boolean;
  /** lap sector completed */
  sector: { idx: number; ms: number; kind: "purple" | "green" | "plain" };
  /** full lap finished */
  finish: { ms: number; pb: boolean };
  /** restart the lap timer (scroll back to grid) */
  lapReset: void;
  /** a timed lap just started — the ghost car launches too */
  lapStart: void;
  /** little HUD toast */
  toast: { text: string; tone?: "accent" | "green" | "purple" | "plain" };
  /** trigger the 3D pit stop animation */
  pitstop: void;
  /** overdrive cheat (DRS mode) on/off */
  overdrive: boolean;
  /** start the 30-second guided hot-lap tour */
  hotlap: void;
};

type Handler<T> = (payload: T) => void;

const handlers = new Map<string, Set<Handler<never>>>();

export function on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(fn as Handler<never>);
  return () => off(event, fn);
}

export function off<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>) {
  handlers.get(event)?.delete(fn as Handler<never>);
}

export function emit<K extends keyof BusEvents>(
  event: K,
  ...payload: BusEvents[K] extends void ? [] : [BusEvents[K]]
) {
  handlers.get(event)?.forEach((fn) => (fn as Handler<unknown>)(payload[0]));
}

/* The racing-line path is computed after layout; late subscribers (the HUD
   minimap) can pull the last value instead of racing the emit. */
let lastPath: { x: number; y: number }[] | null = null;
export function setLastPath(points: { x: number; y: number }[]) {
  lastPath = points;
}
export function getLastPath() {
  return lastPath;
}
