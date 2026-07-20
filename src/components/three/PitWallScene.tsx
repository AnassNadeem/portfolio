import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { projects, driver, type Project } from "../../data/portfolio";
import { useApp } from "../../context/AppContext";

/** ─────────────────────────────────────────────────────────────────────────
 *  THE PIT WALL — a curved bank of race-engineer monitors.
 *  The camera sits at the engineer's chair; you pan LEFT/RIGHT only,
 *  like sweeping your eyes across the timing screens.
 *  ──────────────────────────────────────────────────────────────────────── */

const RADIUS = 6.4;
const COL_STEP = THREE.MathUtils.degToRad(21);
const ROW_Y = [1.14, -1.14];
const SCREEN_W = 2.2;
const SCREEN_H = 1.34;

export type WallApi = {
  yawTarget: number;
  maxYaw: number;
};

/** true while the last pointer gesture was a drag — swallows the trailing click */
const dragGuard = { active: false };

/** column/row slot for index i (row-major, 4 columns × 2 rows) */
function slotFor(i: number): { angle: number; y: number } {
  const col = i % 4;
  const row = Math.floor(i / 4);
  const angle = (col - 1.5) * COL_STEP;
  return { angle, y: ROW_Y[row] ?? 0 };
}

/** JetBrains-style label strip under each screen, drawn on canvas */
function makeLabelTexture(round: string, name: string, status: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const draw = () => {
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, 1024, 96);
    x.fillStyle = "rgba(10,10,13,0.92)";
    x.fillRect(0, 0, 1024, 96);
    x.fillStyle = "#e10600";
    x.fillRect(0, 0, 8, 96);
    x.font = "700 34px 'JetBrains Mono', monospace";
    x.fillStyle = "#8d939a";
    x.textBaseline = "middle";
    x.fillText(round, 36, 50);
    x.font = "italic 900 40px 'Titillium Web', sans-serif";
    x.fillStyle = "#f5f5f7";
    x.fillText(name.toUpperCase(), 130, 50);
    x.font = "500 26px 'JetBrains Mono', monospace";
    x.fillStyle = "#2bd354";
    x.textAlign = "right";
    x.fillText(status, 990, 50);
    x.textAlign = "left";
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return tex;
}

/** static-noise texture for the vacant screen */
function makeStaticTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  const img = x.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 14 + Math.random() * 34;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** CSP-safe 3D label — canvas texture instead of troika workers (blocked under strict CSP). */
function makeCanvasTextTexture(
  lines: { text: string; size: number; color: string; y: number; font?: string }[],
  width = 1024,
  height = 256
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const tex = new THREE.CanvasTexture(c);
  const draw = () => {
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, width, height);
    for (const line of lines) {
      x.font = `${line.size}px ${line.font ?? "'JetBrains Mono', monospace"}`;
      x.fillStyle = line.color;
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(line.text, width / 2, line.y);
    }
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return tex;
}

function CanvasTextPlane({
  lines,
  position,
  rotation = [0, 0, 0],
  plane = [1.9, 0.5],
}: {
  lines: { text: string; size: number; color: string; y: number; font?: string }[];
  position: [number, number, number];
  rotation?: [number, number, number];
  plane?: [number, number];
}) {
  const tex = useMemo(() => makeCanvasTextTexture(lines), [JSON.stringify(lines)]);
  return (
    <mesh position={position} rotation={rotation} raycast={() => null}>
      <planeGeometry args={plane} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** thin scanline overlay shared by all screens */
function makeScanlineTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const x = c.getContext("2d")!;
  x.clearRect(0, 0, 4, 64);
  x.fillStyle = "rgba(0,0,0,0.28)";
  for (let y = 0; y < 64; y += 4) x.fillRect(0, y, 4, 1.4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 10);
  return tex;
}

function Monitor({
  project,
  angle,
  y,
  accent,
  onSelect,
  scanTex,
}: {
  project: Project;
  angle: number;
  y: number;
  accent: string;
  onSelect: (p: Project) => void;
  scanTex: THREE.CanvasTexture;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const tex = useTexture(project.image ?? "/projects/portfolio.png");
  const labelTex = useMemo(
    () => makeLabelTexture(project.round, project.name, project.status ?? "ONLINE"),
    [project]
  );

  const pos = useMemo<[number, number, number]>(
    () => [Math.sin(angle) * RADIUS, y, -Math.cos(angle) * RADIUS],
    [angle, y]
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const s = hovered ? 1.055 : 1;
    g.scale.x += (s - g.scale.x) * 0.14;
    g.scale.y += (s - g.scale.y) * 0.14;
    g.scale.z += (s - g.scale.z) * 0.14;
  });

  return (
    <group
      ref={groupRef}
      position={pos}
      rotation={[Math.atan2(y, RADIUS) * -0.28, -angle, 0]}
    >
      {/* bezel */}
      <mesh position={[0, -0.06, -0.045]} castShadow>
        <boxGeometry args={[SCREEN_W + 0.14, SCREEN_H + 0.44, 0.08]} />
        <meshStandardMaterial color="#131318" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* screen */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (dragGuard.active) return;
          onSelect(project);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* scanlines + glass tint */}
      <mesh position={[0, 0, 0.004]} raycast={() => null}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={scanTex} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* hover glow frame */}
      <mesh position={[0, 0, 0.006]} raycast={() => null}>
        <planeGeometry args={[SCREEN_W + 0.06, SCREEN_H + 0.06]} />
        <meshBasicMaterial color={accent} transparent opacity={hovered ? 0.16 : 0} depthWrite={false} />
      </mesh>
      {/* label strip */}
      <mesh position={[0, -(SCREEN_H / 2) - 0.16, 0.002]} raycast={() => null}>
        <planeGeometry args={[SCREEN_W, 0.22]} />
        <meshBasicMaterial map={labelTex} transparent toneMapped={false} />
      </mesh>
      {/* cheap "screen glow" halo behind the bezel — no extra lights */}
      <mesh position={[0, -0.06, -0.09]} raycast={() => null}>
        <planeGeometry args={[SCREEN_W + 0.9, SCREEN_H + 0.9]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={hovered ? 0.1 : 0.045}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/** vacant slot: static noise + "your project here" — links to contact */
function VacantMonitor({
  angle,
  y,
  accent,
  scanTex,
}: {
  angle: number;
  y: number;
  accent: string;
  scanTex: THREE.CanvasTexture;
}) {
  const { scrollTo } = useApp();
  const staticTex = useMemo(makeStaticTexture, []);
  const [hovered, setHovered] = useState(false);
  const pos = useMemo<[number, number, number]>(
    () => [Math.sin(angle) * RADIUS, y, -Math.cos(angle) * RADIUS],
    [angle, y]
  );

  useFrame((state) => {
    // jitter the noise so it reads as live static
    staticTex.offset.set(
      Math.floor(state.clock.elapsedTime * 18 % 4) / 4,
      Math.floor(state.clock.elapsedTime * 24 % 4) / 4
    );
  });

  const vacantTex = useMemo(
    () =>
      makeCanvasTextTexture(
        [
          { text: "AWAITING SIGNAL", size: 56, color: hovered ? accent : "#9ba1a6", y: 72 },
          {
            text: `R${projects.length + 1} — YOUR PROJECT? OPEN THE RADIO ▸`,
            size: 36,
            color: "#71767c",
            y: 184,
          },
        ],
        1024,
        256
      ),
    [hovered, accent]
  );

  return (
    <group position={pos} rotation={[Math.atan2(y, RADIUS) * -0.28, -angle, 0]}>
      <mesh position={[0, -0.06, -0.045]}>
        <boxGeometry args={[SCREEN_W + 0.14, SCREEN_H + 0.44, 0.08]} />
        <meshStandardMaterial color="#131318" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (dragGuard.active) return;
          scrollTo("#contact");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={staticTex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.004]} raycast={() => null}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={scanTex} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]} raycast={() => null}>
        <planeGeometry args={[SCREEN_W * 0.92, SCREEN_H * 0.55]} />
        <meshBasicMaterial map={vacantTex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** decorative arc rails above and below the monitor bank */
function ArcRails({ accent }: { accent: string }) {
  const rail = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const span = COL_STEP * 3 + 0.34;
    for (let i = 0; i <= 40; i++) {
      const a = -span / 2 + (span * i) / 40;
      pts.push(new THREE.Vector3(Math.sin(a) * (RADIUS + 0.12), 0, -Math.cos(a) * (RADIUS + 0.12)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 40, 0.012, 6, false);
  }, []);
  return (
    <group>
      <mesh geometry={rail} position={[0, 2.25, 0]}>
        <meshBasicMaterial color={accent} transparent opacity={0.5} />
      </mesh>
      <mesh geometry={rail} position={[0, -2.45, 0]}>
        <meshBasicMaterial color={accent} transparent opacity={0.24} />
      </mesh>
    </group>
  );
}

/** floating dust motes for depth */
function Dust() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 140;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (Math.random() - 0.5) * 1.6;
      const r = 2.4 + Math.random() * 4.4;
      pos[i * 3] = Math.sin(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = -Math.cos(a) * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.04;
  });
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.02} color="#9ba1a6" transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** LEFT-RIGHT pan only: pointer drag rotates the wall's yaw, clamped. */
function PanRig({
  api,
  progressEl,
  wallRef,
}: {
  api: React.RefObject<WallApi>;
  progressEl: React.RefObject<HTMLDivElement | null>;
  wallRef: React.RefObject<THREE.Group | null>;
}) {
  const { gl, camera, size } = useThree();
  const yaw = useRef(0);

  // widen the view on tall/narrow screens so a full column fits, and give
  // narrow screens more pan travel (wide screens see most of the wall already)
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    cam.fov = aspect < 0.9 ? 62 : aspect < 1.35 ? 52 : 44;
    cam.updateProjectionMatrix();
    api.current.maxYaw = aspect < 0.9 ? 0.52 : aspect < 1.35 ? 0.34 : 0.2;
  }, [camera, size, api]);

  const lastInteract = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;

    let travelled = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      travelled = 0;
      dragGuard.active = false;
      lastX = e.clientX;
      lastInteract.current = performance.now();
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      travelled += Math.abs(dx);
      if (travelled > 10) dragGuard.active = true; // it's a pan, not a click
      lastInteract.current = performance.now();
      const a = api.current;
      a.yawTarget = THREE.MathUtils.clamp(a.yawTarget + dx * 0.0032, -a.maxYaw, a.maxYaw);
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
      // let the click event (fired right after pointerup) see the guard first
      setTimeout(() => {
        dragGuard.active = false;
      }, 0);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl, api]);

  const prevTarget = useRef(0);

  useFrame(({ pointer, clock }) => {
    const a = api.current;
    // keep the external nudges clamped too
    a.yawTarget = THREE.MathUtils.clamp(a.yawTarget, -a.maxYaw, a.maxYaw);
    // arrow-button nudges count as interaction too
    if (a.yawTarget !== prevTarget.current) {
      prevTarget.current = a.yawTarget;
      lastInteract.current = performance.now();
    }
    // idle: the wall breathes — a slow sweep hints that it can be panned
    const idleFor = performance.now() - lastInteract.current;
    const idleAmp = THREE.MathUtils.clamp((idleFor - 5000) / 4000, 0, 1);
    const drift = Math.sin(clock.elapsedTime * 0.22) * 0.055 * idleAmp;
    yaw.current += (a.yawTarget + drift - yaw.current) * 0.075;
    if (wallRef.current) wallRef.current.rotation.y = yaw.current;

    // gentle parallax: lean into the pointer, never off the chair
    camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.05;
    camera.position.y += (pointer.y * 0.16 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, -RADIUS);

    // drive the HTML progress thumb directly (no React re-render)
    const p = (yaw.current / a.maxYaw + 1) / 2;
    const elp = progressEl.current;
    if (elp) elp.style.transform = `translateX(${(1 - p) * 100 * (100 / 28 - 1)}%)`;
  });
  return null;
}

export default function PitWallScene({
  active,
  onSelect,
  api,
  progressEl,
}: {
  active: boolean;
  onSelect: (p: Project) => void;
  api: React.RefObject<WallApi>;
  progressEl: React.RefObject<HTMLDivElement | null>;
}) {
  const { accent } = useApp();
  const wallRef = useRef<THREE.Group>(null);
  const scanTex = useMemo(makeScanlineTexture, []);

  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 0], fov: 44, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
        // R3F forces touch-action:none inline; restore vertical page scrolling
        gl.domElement.style.touchAction = "pan-y";
      }}
    >
      <fog attach="fog" args={["#08080b", 8, 18]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 3, -2]} intensity={1.1} color={accent} decay={1.2} />
      <pointLight position={[0, -3, -1]} intensity={0.4} color="#7d9bff" decay={1.2} />

      <Suspense fallback={null}>
        <group ref={wallRef}>
          {projects.map((p, i) => {
            const { angle, y } = slotFor(i);
            return (
              <Monitor
                key={p.name}
                project={p}
                angle={angle}
                y={y}
                accent={accent}
                onSelect={onSelect}
                scanTex={scanTex}
              />
            );
          })}
          {/* the vacant 8th screen — an invitation */}
          {projects.length < 8 &&
            (() => {
              const { angle, y } = slotFor(projects.length);
              return <VacantMonitor angle={angle} y={y} accent={accent} scanTex={scanTex} />;
            })()}
          <ArcRails accent={accent} />
        </group>
        {/* room shell — a big cylinder around the chair catches the screen light */}
        <mesh position={[0, 0, -RADIUS - 1.2]}>
          <cylinderGeometry args={[RADIUS + 2.6, RADIUS + 2.6, 10, 48, 1, true]} />
          <meshStandardMaterial color="#0b0b0f" roughness={0.9} metalness={0.2} side={THREE.BackSide} />
        </mesh>
        <Dust />
      </Suspense>

      <PanRig api={api} progressEl={progressEl} wallRef={wallRef} />
      <CanvasTextPlane
        lines={[
          {
            text: `${driver.lastName} — RACE ENGINEER`,
            size: 42,
            color: "#3a3f45",
            y: 128,
            font: "'JetBrains Mono', monospace",
          },
        ]}
        position={[0, -1.9, -3.2]}
        rotation={[-0.5, 0, 0]}
        plane={[3.2, 0.35]}
      />
    </Canvas>
  );
}
