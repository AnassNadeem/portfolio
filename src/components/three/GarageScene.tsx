import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, Html, Lightformer, OrbitControls } from "@react-three/drei";
import { useApp } from "../../context/AppContext";
import { garageParts, driver } from "../../data/portfolio";
import F1Car from "./F1Car";
import GarageParticles from "./GarageParticles";

function CameraRig({ manual }: { manual: boolean }) {
  useFrame(({ camera, pointer }) => {
    if (manual) return;
    camera.position.x += (5.4 + pointer.x * 1.0 - camera.position.x) * 0.045;
    camera.position.y += (2.3 - pointer.y * 0.55 - camera.position.y) * 0.045;
    camera.position.z += (7.6 - camera.position.z) * 0.045;
    camera.lookAt(0, 0.72, 0);
  });
  return null;
}

/** Floating callout that fades in as the car explodes */
function PartLabel({
  anchor,
  index,
  text,
  domain,
  active,
  explodeRef,
  onPick,
}: {
  anchor: [number, number, number];
  index: number;
  text: string;
  domain: string;
  active: boolean;
  explodeRef: React.RefObject<number>;
  onPick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    const e = explodeRef.current ?? 0;
    const t = Math.min(1, Math.max(0, (e - 0.35 - index * 0.055) / 0.25));
    el.style.opacity = String(t);
    el.style.transform = `translateY(${(1 - t) * 8}px)`;
    el.style.pointerEvents = t > 0.6 ? "auto" : "none";
  });
  return (
    <Html position={anchor} center zIndexRange={[40, 0]}>
      <button
        ref={ref}
        className={`garage-label ${active ? "is-active" : ""}`}
        onClick={onPick}
        style={{ opacity: 0 }}
        data-cursor="link"
      >
        <span className="garage-label-text">
          <strong>{text}</strong>
          <em>{domain}</em>
        </span>
      </button>
    </Html>
  );
}

/** Showroom turntable — the platform and car rotate together, slowly. */
function Turntable({
  explodeRef,
  activePart,
  onPart,
  accent,
  autoSpin,
}: {
  explodeRef: React.RefObject<number>;
  activePart: string | null;
  onPart: (id: string | null) => void;
  accent: string;
  autoSpin: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (autoSpin && ref.current) ref.current.rotation.y += Math.min(dt, 0.05) * 0.22;
  });

  return (
    <group ref={ref}>
      {/* platform disc */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[4.1, 4.25, 0.1, 64]} />
        <meshStandardMaterial color="#101014" metalness={0.75} roughness={0.35} />
      </mesh>
      {/* glowing rim + inner detail ring */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.96, 4.1, 80]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.55, 2.6, 64]} />
        <meshBasicMaterial color="#2a2a33" />
      </mesh>

      <F1Car mode="garage" explodeRef={explodeRef} onPart={onPart} />

      {garageParts.map((p, i) => (
        <PartLabel
          key={p.id + i}
          anchor={p.anchor}
          index={i}
          text={p.part}
          domain={p.domain}
          active={activePart === p.id}
          explodeRef={explodeRef}
          onPick={() => onPart(p.id)}
        />
      ))}
    </group>
  );
}

/** A stack of slicks waiting in the corner */
function TireStack({ position, count = 3 }: { position: [number, number, number]; count?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[0, 0.17 + i * 0.34, 0]} rotation={[0, i * 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.33, 24]} />
          <meshStandardMaterial color="#0c0c0f" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.17 + (count - 1) * 0.34 + 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial color="#2bd354" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function ToolCabinet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.4, 1.8, 0.75]} />
        <meshStandardMaterial color="#15151b" metalness={0.6} roughness={0.4} />
      </mesh>
      {[0.55, 0.18, -0.19, -0.56].map((y) => (
        <mesh key={y} position={[0, y, 0.38]}>
          <boxGeometry args={[1.24, 0.045, 0.02]} />
          <meshStandardMaterial color="#2c2c35" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 1.04, 0]} castShadow>
        <boxGeometry args={[0.8, 0.28, 0.5]} />
        <meshStandardMaterial color="#1a1a21" metalness={0.5} roughness={0.45} />
      </mesh>
    </group>
  );
}

/** Back wall with neon strips — enough "garage" to sell the room */
function GarageWalls({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 4.4, -9.5]} receiveShadow>
        <planeGeometry args={[40, 11]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.92} metalness={0.1} />
      </mesh>
      {/* horizontal neon rail */}
      <mesh position={[0, 5.7, -9.45]}>
        <planeGeometry args={[26, 0.07]} />
        <meshBasicMaterial color={accent} transparent opacity={0.9} />
      </mesh>
      {/* vertical strips */}
      {[-10.5, -5.25, 5.25, 10.5].map((x) => (
        <mesh key={x} position={[x, 3.4, -9.45]}>
          <planeGeometry args={[0.06, 5.4]} />
          <meshBasicMaterial color="#3a3a46" />
        </mesh>
      ))}
      {/* side wall hints */}
      <mesh position={[-13.5, 4.4, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[18, 11]} />
        <meshStandardMaterial color="#0b0b0f" roughness={0.95} />
      </mesh>
      <mesh position={[13.5, 4.4, -2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[18, 11]} />
        <meshStandardMaterial color="#0b0b0f" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** "PIT 42" stencil painted on the concrete */
function FloorDecal() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, 512, 256);
    x.strokeStyle = "#f5f5f7";
    x.lineWidth = 6;
    x.strokeRect(10, 10, 492, 236);
    x.fillStyle = "#f5f5f7";
    x.font = "italic 900 110px 'Titillium Web', sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(`PIT ${driver.number}`, 256, 132);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    document.fonts?.ready.then(() => {
      x.clearRect(0, 0, 512, 256);
      x.strokeRect(10, 10, 492, 236);
      x.fillText(`PIT ${driver.number}`, 256, 132);
      t.needsUpdate = true;
    });
    return t;
  }, []);
  return (
    <mesh position={[5.6, -0.095, 3.4]} rotation={[-Math.PI / 2, 0, -0.5]}>
      <planeGeometry args={[3.0, 1.5]} />
      <meshBasicMaterial map={tex} transparent opacity={0.2} depthWrite={false} />
    </mesh>
  );
}

/** Straight cylinder strut between two world-space points — the lamp arm. */
function Strut({
  from,
  to,
  radius = 0.09,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius?: number;
}) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const d = b.clone().sub(a);
    const len = d.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.normalize()
    );
    return { pos: a.clone().lerp(b, 0.5), quat, len };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      <meshStandardMaterial color="#1e1e25" metalness={0.7} roughness={0.35} />
    </mesh>
  );
}

/* Lamp rig geometry — mirrors the 2D About lamp: clamp on the RIGHT wall,
 * two-segment arm reaching in, shade hanging upper-right of the car with the
 * cone aimed at the turntable center. (+x/−z ≈ viewport-right for the
 * default camera, so the rig reads as mounted off the right edge.) */
const LAMP_MOUNT: [number, number, number] = [13.3, 9.3, -2.1];
const LAMP_ELBOW: [number, number, number] = [9.2, 8.8, -2.2];
const LAMP_BULB: [number, number, number] = [4.6, 7.0, -2.4];
const LAMP_TARGET: [number, number, number] = [0, 0.15, 0];

/** Focused work-lamp spotlight — emits from the right-mounted shade and lands
 *  as a tight pool on the car footprint only (no room-wide wash). */
function LightCone({ accent, reduced }: { accent: string; reduced: boolean }) {
  const { quat, height } = useMemo(() => {
    const a = new THREE.Vector3(...LAMP_BULB);
    const b = new THREE.Vector3(...LAMP_TARGET);
    const d = b.clone().sub(a);
    return {
      height: d.length(),
      quat: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        d.clone().normalize()
      ),
    };
  }, []);

  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...LAMP_TARGET);
    return o;
  }, []);

  const bulbMat = useRef<THREE.MeshBasicMaterial>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (reduced) return;
    const p = 0.86 + Math.sin(clock.elapsedTime * 1.7) * 0.14;
    if (bulbMat.current) bulbMat.current.opacity = 0.5 + 0.3 * p;
    if (glowRef.current) glowRef.current.intensity = 1.2 * p;
  });

  return (
    <group>
      {/* right-wall mount plate + articulated arm */}
      <mesh position={LAMP_MOUNT}>
        <boxGeometry args={[0.18, 1.15, 0.7]} />
        <meshStandardMaterial color="#22222a" metalness={0.6} roughness={0.4} />
      </mesh>
      <Strut from={LAMP_MOUNT} to={LAMP_ELBOW} />
      <Strut from={LAMP_ELBOW} to={LAMP_BULB} />
      <mesh position={LAMP_ELBOW}>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color="#2c2c35" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* shade, bulb face and volumetric cone — all aimed at the car */}
      <group position={LAMP_BULB} quaternion={quat}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.32, 0.95, 1.05, 24]} />
          <meshStandardMaterial
            color="#16161c"
            metalness={0.7}
            roughness={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.78, 24]} />
          <meshBasicMaterial ref={bulbMat} color={accent} transparent opacity={0.75} />
        </mesh>
        {/* soft outer cone + brighter core = volumetric beam onto the car only */}
        <mesh position={[0, -height / 2, 0]}>
          <coneGeometry args={[2.05, height, 40, 1, true]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[0, -height / 2, 0]}>
          <coneGeometry args={[1.15, height, 32, 1, true]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.075}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <pointLight
          ref={glowRef}
          position={[0, -0.4, 0]}
          intensity={1.2}
          color={accent}
          distance={5}
          decay={2}
        />
      </group>

      {/* tight white key light — angle sized to the car footprint, not the room */}
      <primitive object={spotTarget} />
      <spotLight
        position={LAMP_BULB}
        target={spotTarget}
        angle={0.3}
        penumbra={0.55}
        intensity={4.2}
        color="#ffffff"
        distance={15}
        decay={0}
        castShadow={false}
      />

      {/* landing pool, tight under the car (turntable disc is r=4.1) */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.05, 40]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export default function GarageScene({
  active,
  explodeRef,
  activePart,
  onPart,
  autoSpin,
  manualOrbit,
}: {
  active: boolean;
  explodeRef: React.RefObject<number>;
  activePart: string | null;
  onPart: (id: string | null) => void;
  autoSpin: boolean;
  manualOrbit: boolean;
}) {
  const { accent, reduced } = useApp();

  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [5.4, 2.3, 7.6], fov: 33 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
      }}
    >
      <fog attach="fog" args={["#0a0a0c", 11, 30]} />
      {/* room lights dimmed so the work lamp clearly owns the car */}
      <ambientLight intensity={0.17} />
      <directionalLight position={[4, 7, 3]} intensity={0.65} />
      <pointLight position={[-7, 3, -3]} intensity={0.85} color={accent} decay={0} />
      <pointLight position={[6, 2, 5]} intensity={0.35} color="#7d9bff" decay={0} />

      <Suspense fallback={null}>
        {/* No external HDR preset — CSP-safe; Lightformers only (same as HeroScene) */}
        <Environment resolution={256}>
          <Lightformer intensity={1.3} position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[10, 3, 1]} form="rect" />
          <Lightformer intensity={0.6} position={[-6, 2, 3]} rotation={[0, Math.PI / 3, 0]} scale={[4, 1.2, 1]} form="rect" />
          <Lightformer intensity={0.45} position={[6, 2.5, -2]} rotation={[0, -Math.PI / 2.6, 0]} scale={[4, 1, 1]} form="rect" />
        </Environment>

        {/* the rotating exhibit */}
        <Turntable explodeRef={explodeRef} activePart={activePart} onPart={onPart} accent={accent} autoSpin={autoSpin} />
        <GarageParticles accent={accent} />

        {/* the room */}
        <GarageWalls accent={accent} />
        <TireStack position={[-6.8, -0.1, -4.6]} />
        <TireStack position={[7.4, -0.1, -5.6]} count={4} />
        <ToolCabinet position={[-8.4, 0.8, -6.4]} />
        <FloorDecal />
        <LightCone accent={accent} reduced={reduced} />

        {/* concrete floor under everything */}
        <mesh position={[0, -0.105, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#0b0b0e" roughness={0.92} metalness={0.15} />
        </mesh>
        <Grid
          position={[0, -0.1, 0]}
          args={[40, 40]}
          cellSize={0.9}
          cellThickness={0.6}
          cellColor="#1c1c22"
          sectionSize={4.5}
          sectionThickness={1}
          sectionColor="#26262e"
          fadeDistance={30}
          fadeStrength={1.6}
        />
        <ContactShadows position={[0, 0.005, 0]} opacity={0.6} scale={14} blur={2.6} far={2.4} resolution={512} />
      </Suspense>

      {manualOrbit && (
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI * 0.22}
          maxPolarAngle={Math.PI * 0.48}
          target={[0, 0.72, 0]}
          rotateSpeed={0.55}
          dampingFactor={0.08}
          enableDamping
        />
      )}
      <CameraRig manual={manualOrbit} />
    </Canvas>
  );
}
