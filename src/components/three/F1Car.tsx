import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGSAP } from "@gsap/react";
import { gsap } from "../../lib/gsap";
import { useApp } from "../../context/AppContext";
import { on as busOn, emit as busEmit } from "../../lib/bus";
import { playRev, playShift } from "../../lib/sound";
import { driver, garageParts } from "../../data/portfolio";

const WHEEL_R = 0.42;
const COMPOUNDS = [
  { name: "SOFT", color: "#e10600" },
  { name: "MEDIUM", color: "#ffd320" },
  { name: "HARD", color: "#f5f5f7" },
];

type Mode = "hero" | "garage";
type PartCb = (id: string | null) => void;

const partOffset = (id: string): [number, number, number] =>
  (garageParts.find((p) => p.id === id)?.offset ?? [0, 0, 0]) as [number, number, number];

/** A car part that drifts to its exploded position as explodeRef → 1 */
function Part({
  id,
  explodeRef,
  offset,
  onPart,
  children,
}: {
  id: string;
  explodeRef?: React.RefObject<number>;
  offset?: [number, number, number];
  onPart?: PartCb;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(...(offset ?? partOffset(id))), [id, offset]);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const e = explodeRef?.current ?? 0;
    g.position.x += (target.x * e - g.position.x) * 0.13;
    g.position.y += (target.y * e - g.position.y) * 0.13;
    g.position.z += (target.z * e - g.position.z) * 0.13;
  });
  const events = onPart
    ? {
        onPointerOver: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onPart(id);
        },
        onPointerOut: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onPart(null);
        },
        onClick: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onPart(id);
        },
      }
    : {};
  return (
    <group ref={ref} {...events}>
      {children}
    </group>
  );
}

function WheelMeshes({
  width,
  tire,
  rim,
  ring,
}: {
  width: number;
  tire: THREE.Material;
  rim: THREE.Material;
  ring: THREE.Material;
}) {
  return (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={tire} castShadow>
        <cylinderGeometry args={[WHEEL_R, WHEEL_R, width, 28]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={rim}>
        <cylinderGeometry args={[WHEEL_R * 0.6, WHEEL_R * 0.6, width + 0.02, 20]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={rim}>
        <cylinderGeometry args={[WHEEL_R * 0.18, WHEEL_R * 0.18, width + 0.05, 12]} />
      </mesh>
      <mesh position={[0, 0, width / 2 + 0.002]} material={ring}>
        <torusGeometry args={[WHEEL_R * 0.8, 0.013, 6, 40]} />
      </mesh>
      <mesh position={[0, 0, -(width / 2 + 0.002)]} material={ring}>
        <torusGeometry args={[WHEEL_R * 0.8, 0.013, 6, 40]} />
      </mesh>
    </>
  );
}

function Strut({
  from,
  to,
  material,
  radius = 0.024,
}: {
  from: [number, number, number];
  to: [number, number, number];
  material: THREE.Material;
  radius?: number;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length();
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize()
      ),
      length,
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[radius, radius, length, 6]} />
    </mesh>
  );
}

/** crisp text decal texture drawn on a canvas — zero asset files */
function makeTextTexture(text: string, accent = false): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const draw = () => {
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, 512, 128);
    if (accent) {
      x.fillStyle = "#f5f5f7";
      x.fillRect(8, 44, 26, 40);
    }
    x.fillStyle = "#f5f5f7";
    x.font = "italic 900 64px 'Titillium Web', sans-serif";
    x.textAlign = accent ? "left" : "center";
    x.textBaseline = "middle";
    x.fillText(text, accent ? 52 : 256, 68);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return tex;
}

type Particle = { life: number; pos: THREE.Vector3; vel: THREE.Vector3 };

export default function F1Car({
  mode = "hero",
  explodeRef,
  onPart,
}: {
  mode?: Mode;
  explodeRef?: React.RefObject<number>;
  onPart?: PartCb;
}) {
  const { ready, accent, revCount, rev, soundOn, velocityRef } = useApp();
  const { camera, gl } = useThree();
  const isHero = mode === "hero";

  const driveOutRef = useRef<THREE.Group>(null);
  const driveInRef = useRef<THREE.Group>(null);
  const liftRef = useRef<THREE.Group>(null); // pit-stop jack
  const bodyRef = useRef<THREE.Group>(null); // vibration / shake
  const spinRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const steerRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const pitRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const spriteRefs = useRef<(THREE.Sprite | null)[]>([]);
  const rainLightMat = useRef<THREE.MeshBasicMaterial>(null);
  const exhaustLight = useRef<THREE.PointLight>(null);

  const spinAngle = useRef(0);
  const boost = useRef(0);
  const shake = useRef(0);
  const lastX = useRef(0);
  const pitBusy = useRef(false);
  const compoundIdx = useRef(0);
  const particles = useRef<Particle[]>(
    Array.from({ length: 14 }, () => ({
      life: 1,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
    }))
  );

  const mats = useMemo(() => {
    const livery = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent),
      metalness: 0.55,
      roughness: 0.24,
    });
    const carbon = new THREE.MeshStandardMaterial({ color: "#16161b", metalness: 0.4, roughness: 0.48 });
    const dark = new THREE.MeshStandardMaterial({ color: "#0e0e11", metalness: 0.3, roughness: 0.42 });
    const tire = new THREE.MeshStandardMaterial({ color: "#0b0b0d", metalness: 0, roughness: 0.96 });
    const rim = new THREE.MeshStandardMaterial({ color: "#26262e", metalness: 0.9, roughness: 0.32 });
    const ring = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) });
    return { livery, carbon, dark, tire, rim, ring };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = new THREE.Color(accent);
    gsap.to(mats.livery.color, { r: c.r, g: c.g, b: c.b, duration: 0.6, ease: "power2.out" });
    gsap.to(mats.ring.color, { r: c.r, g: c.g, b: c.b, duration: 0.6, ease: "power2.out" });
  }, [accent, mats]);

  const numberTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const tex = new THREE.CanvasTexture(c);
    const draw = () => {
      const x = c.getContext("2d")!;
      x.clearRect(0, 0, 256, 256);
      x.fillStyle = "#f5f5f7";
      x.font = "italic 900 130px 'Titillium Web', sans-serif";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(driver.number, 128, 134);
      tex.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
    return tex;
  }, []);

  const nameTex = useMemo(() => makeTextTexture(`${driver.firstName} ${driver.lastName}`, true), []);
  const numSmallTex = useMemo(() => makeTextTexture(driver.number), []);

  const smokeTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(220,220,225,0.85)");
    g.addColorStop(0.6, "rgba(180,180,190,0.35)");
    g.addColorStop(1, "rgba(160,160,170,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);

  const spawnSmoke = (count = 12) => {
    let spawned = 0;
    for (const p of particles.current) {
      if (p.life < 1 || spawned >= count) continue;
      spawned++;
      p.life = 0;
      p.pos.set(-1.72 + Math.random() * 0.3, 0.22, (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.2));
      p.vel.set(-1.4 - Math.random() * 1.2, 0.7 + Math.random() * 0.7, (Math.random() - 0.5) * 0.9);
    }
  };

  // ── REV ──
  useEffect(() => {
    if (revCount === 0 || !isHero) return;
    boost.current = 46;
    shake.current = 1;
    spawnSmoke();
    if (soundOn) playRev();
    const cam = camera as THREE.PerspectiveCamera;
    gsap.to(cam, {
      fov: 38.5,
      duration: 0.16,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
      onUpdate: () => cam.updateProjectionMatrix(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revCount]);

  // ── PIT STOP (BOX BOX) ──
  useEffect(() => {
    if (!isHero) return;
    return busOn("pitstop", () => {
      if (pitBusy.current || !liftRef.current) return;
      pitBusy.current = true;
      const t0 = performance.now();
      compoundIdx.current = (compoundIdx.current + 1) % COMPOUNDS.length;
      const compound = COMPOUNDS[compoundIdx.current];
      const target = new THREE.Color(compound.color);
      const tl = gsap.timeline({
        onComplete: () => {
          pitBusy.current = false;
          const secs = ((performance.now() - t0) / 1000).toFixed(2);
          busEmit("toast", { text: `PIT STOP ${secs}s — ${compound.name} FITTED`, tone: "green" });
          if (soundOn) playRev(0.3);
        },
      });
      if (soundOn) playShift();
      // jack up
      tl.to(liftRef.current.position, { y: 0.24, duration: 0.22, ease: "power3.out" });
      // wheels off (staggered outward)
      pitRefs.current.forEach((w, i) => {
        if (!w) return;
        const dir = Math.sign(w.position.z) || 1;
        tl.to(w.position, { z: w.position.z + dir * 0.42, duration: 0.16, ease: "power2.out" }, 0.24 + i * 0.045);
      });
      // swap compound stripe
      tl.add(() => {
        if (soundOn) playShift(0.25);
        gsap.to(mats.ring.color, { r: target.r, g: target.g, b: target.b, duration: 0.18 });
      }, 0.62);
      // wheels on
      pitRefs.current.forEach((w, i) => {
        if (!w) return;
        const dir = Math.sign(w.position.z) || 1;
        tl.to(w.position, { z: Math.abs(w.position.z) * dir, duration: 0.15, ease: "power2.in" }, 0.86 + i * 0.045);
      });
      // drop the car
      tl.to(liftRef.current.position, { y: 0, duration: 0.5, ease: "elastic.out(1.2, 0.4)" }, 1.18);
      tl.add(() => {
        shake.current = 0.5;
      }, 1.2);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHero, soundOn]);

  // ── entrance after LIGHTS OUT (hero only) ──
  useEffect(() => {
    if (!isHero || !ready || !driveInRef.current || !bodyRef.current) return;
    boost.current = 34;
    gsap.fromTo(driveInRef.current.position, { x: -15 }, { x: 0, duration: 1.4, ease: "power3.out", delay: 0.12 });
    gsap.fromTo(
      bodyRef.current.rotation,
      { z: -0.05 },
      { z: 0, duration: 1.7, ease: "elastic.out(1, 0.35)", delay: 0.5 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isHero]);

  // ── exit on scroll (hero only) ──
  useGSAP(() => {
    if (!isHero) return;
    const hero = document.getElementById("hero");
    if (!hero || !driveOutRef.current) return;
    gsap.fromTo(
      driveOutRef.current.position,
      { x: 0 },
      {
        x: 17,
        ease: "power2.in",
        immediateRender: false,
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom 30%", scrub: 0.5 },
      }
    );
  });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const driveOut = driveOutRef.current;
    const driveIn = driveInRef.current;
    const body = bodyRef.current;
    if (!driveOut || !driveIn || !body) return;

    const worldX = driveOut.position.x + driveIn.position.x;
    const dx = worldX - lastX.current;
    lastX.current = worldX;
    boost.current *= Math.pow(0.93, dt * 60);
    const idle = isHero ? 1.3 : 0.5;
    spinAngle.current -= (idle + boost.current) * dt + dx / WHEEL_R;
    for (const w of spinRefs.current) if (w) w.rotation.z = spinAngle.current;

    const steer = THREE.MathUtils.clamp(-state.pointer.x * 0.34, -0.38, 0.38);
    for (const s of steerRefs.current) {
      if (s) s.rotation.y += (steer - s.rotation.y) * 0.09;
    }

    shake.current *= Math.pow(0.9, dt * 60);
    const amp = (isHero ? 0.0035 : 0.0015) + shake.current * 0.028;
    body.position.y = Math.sin(state.clock.elapsedTime * 64) * amp;
    body.rotation.x = Math.sin(state.clock.elapsedTime * 50) * amp * 0.7;

    // scroll-reactive lights: rain light blinks under braking (scroll up),
    // exhaust glows on throttle (scroll down)
    const vel = velocityRef.current ?? 0;
    if (rainLightMat.current) {
      const braking = vel < -3;
      rainLightMat.current.opacity = braking
        ? Math.sin(state.clock.elapsedTime * 26) > 0
          ? 1
          : 0.12
        : 0.25;
    }
    if (exhaustLight.current) {
      const throttle = Math.min(1, Math.max(0, vel - 4) / 26) + Math.min(1, boost.current / 40);
      exhaustLight.current.intensity = throttle * (1.6 + Math.sin(state.clock.elapsedTime * 47) * 0.6);
    }

    particles.current.forEach((p, i) => {
      const sprite = spriteRefs.current[i];
      if (!sprite) return;
      if (p.life >= 1) {
        sprite.scale.setScalar(0.001);
        return;
      }
      p.life = Math.min(1, p.life + dt * 0.8);
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y *= 1 - dt * 0.4;
      sprite.position.copy(p.pos);
      const s = 0.35 + p.life * 1.7;
      sprite.scale.set(s, s, 1);
      (sprite.material as THREE.SpriteMaterial).opacity = (1 - p.life) * 0.55;
    });
  });

  const heroEvents = isHero
    ? {
        onPointerOver: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          gl.domElement.setAttribute("data-cursor", "rev");
        },
        onPointerOut: () => gl.domElement.removeAttribute("data-cursor"),
        onClick: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          rev();
        },
      }
    : {};

  const wheels: { x: number; z: number; front: boolean; w: number }[] = [
    { x: 1.78, z: 0.86, front: true, w: 0.34 },
    { x: 1.78, z: -0.86, front: true, w: 0.34 },
    { x: -1.72, z: 0.88, front: false, w: 0.42 },
    { x: -1.72, z: -0.88, front: false, w: 0.42 },
  ];

  const decal = (tex: THREE.CanvasTexture) => (
    <meshBasicMaterial map={tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
  );

  return (
    <group ref={driveOutRef}>
      <group ref={driveInRef} position={isHero ? [-15, 0, 0] : [0, 0, 0]}>
        <group {...heroEvents}>
          {/* ── chassis on the jack ── */}
          <group ref={liftRef}>
            <group ref={bodyRef}>
              {/* FLOOR + plank + suspension → "INFRA & TOOLING" */}
              <Part id="floor" explodeRef={explodeRef} onPart={onPart}>
                <mesh position={[0.1, 0.16, 0]} material={mats.dark} castShadow>
                  <boxGeometry args={[4.7, 0.07, 1.42]} />
                </mesh>
                <Strut from={[1.45, 0.52, 0.26]} to={[1.78, 0.46, 0.74]} material={mats.carbon} />
                <Strut from={[1.45, 0.52, -0.26]} to={[1.78, 0.46, -0.74]} material={mats.carbon} />
                <Strut from={[1.45, 0.3, 0.26]} to={[1.78, 0.34, 0.74]} material={mats.carbon} />
                <Strut from={[1.45, 0.3, -0.26]} to={[1.78, 0.34, -0.74]} material={mats.carbon} />
                <Strut from={[-1.4, 0.52, 0.26]} to={[-1.72, 0.46, 0.76]} material={mats.carbon} />
                <Strut from={[-1.4, 0.52, -0.26]} to={[-1.72, 0.46, -0.76]} material={mats.carbon} />
                <Strut from={[-1.4, 0.3, 0.26]} to={[-1.72, 0.34, 0.76]} material={mats.carbon} />
                <Strut from={[-1.4, 0.3, -0.26]} to={[-1.72, 0.34, -0.76]} material={mats.carbon} />
              </Part>

              {/* NOSE + MONOCOQUE → "CORE LANGUAGES" */}
              <Part id="nose" explodeRef={explodeRef} onPart={onPart}>
                <mesh
                  position={[1.95, 0.5, 0]}
                  rotation={[0, 0, -Math.PI / 2]}
                  scale={[1, 1, 1.45]}
                  material={mats.livery}
                  castShadow
                >
                  <cylinderGeometry args={[0.09, 0.27, 1.75, 16]} />
                </mesh>
                <mesh position={[0.72, 0.55, 0]} material={mats.livery} castShadow>
                  <boxGeometry args={[1.75, 0.5, 0.68]} />
                </mesh>
                <mesh position={[0.62, 0.82, 0]} material={mats.dark}>
                  <boxGeometry args={[0.78, 0.16, 0.46]} />
                </mesh>
                <mesh position={[0.16, 0.86, 0]} material={mats.carbon}>
                  <boxGeometry args={[0.32, 0.18, 0.46]} />
                </mesh>
                {/* mirrors */}
                <mesh position={[0.98, 0.92, 0.5]} material={mats.carbon}>
                  <boxGeometry args={[0.1, 0.07, 0.16]} />
                </mesh>
                <mesh position={[0.98, 0.92, -0.5]} material={mats.carbon}>
                  <boxGeometry args={[0.1, 0.07, 0.16]} />
                </mesh>
                {/* race number on the nose */}
                <mesh position={[1.66, 0.71, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                  <planeGeometry args={[0.46, 0.46]} />
                  <meshBasicMaterial map={numberTex} transparent depthWrite={false} />
                </mesh>
              </Part>

              {/* HALO → "TESTING & SAFETY" */}
              <Part id="halo" explodeRef={explodeRef} onPart={onPart}>
                <mesh position={[0.58, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.carbon}>
                  <torusGeometry args={[0.37, 0.034, 8, 28]} />
                </mesh>
                <mesh position={[0.93, 0.83, 0]} rotation={[0, 0, 0.25]} material={mats.carbon}>
                  <cylinderGeometry args={[0.028, 0.028, 0.42, 8]} />
                </mesh>
              </Part>

              {/* ENGINE COVER + airbox + fin → "AI & DATA" */}
              <Part id="power" explodeRef={explodeRef} onPart={onPart}>
                <mesh position={[-0.08, 1.04, 0]} material={mats.carbon} castShadow>
                  <boxGeometry args={[0.52, 0.3, 0.4]} />
                </mesh>
                <mesh position={[-0.78, 0.74, 0]} material={mats.livery} castShadow>
                  <boxGeometry args={[1.95, 0.42, 0.5]} />
                </mesh>
                <mesh position={[-1.5, 1.0, 0]} material={mats.livery}>
                  <boxGeometry args={[1.15, 0.5, 0.035]} />
                </mesh>
                <mesh position={[-0.08, 1.26, 0]} material={mats.ring}>
                  <boxGeometry args={[0.16, 0.1, 0.12]} />
                </mesh>
              </Part>

              {/* SIDEPODS → "APIs & SERVICES" */}
              <Part id="sidepods" explodeRef={explodeRef} offset={[0, 0, 1.15]} onPart={onPart}>
                <mesh position={[-0.35, 0.49, 0.72]} material={mats.livery} castShadow>
                  <boxGeometry args={[1.85, 0.46, 0.58]} />
                </mesh>
                <mesh position={[0.56, 0.52, 0.72]} material={mats.dark}>
                  <boxGeometry args={[0.16, 0.34, 0.5]} />
                </mesh>
                <mesh position={[-0.35, 0.52, 1.012]}>
                  <planeGeometry args={[1.45, 0.28]} />
                  {decal(nameTex)}
                </mesh>
              </Part>
              <Part id="sidepods" explodeRef={explodeRef} offset={[0, 0, -1.15]} onPart={onPart}>
                <mesh position={[-0.35, 0.49, -0.72]} material={mats.livery} castShadow>
                  <boxGeometry args={[1.85, 0.46, 0.58]} />
                </mesh>
                <mesh position={[0.56, 0.52, -0.72]} material={mats.dark}>
                  <boxGeometry args={[0.16, 0.34, 0.5]} />
                </mesh>
                <mesh position={[-0.35, 0.52, -1.012]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[1.45, 0.28]} />
                  {decal(nameTex)}
                </mesh>
              </Part>

              {/* FRONT WING → "FRONTEND" */}
              <Part id="frontwing" explodeRef={explodeRef} onPart={onPart}>
                <mesh position={[2.55, 0.14, 0]} material={mats.carbon} castShadow>
                  <boxGeometry args={[0.55, 0.045, 1.95]} />
                </mesh>
                <mesh position={[2.4, 0.26, 0]} rotation={[0, 0, 0.16]} material={mats.livery}>
                  <boxGeometry args={[0.4, 0.04, 1.85]} />
                </mesh>
                <mesh position={[2.5, 0.27, 0.98]} material={mats.carbon}>
                  <boxGeometry args={[0.6, 0.3, 0.04]} />
                </mesh>
                <mesh position={[2.5, 0.27, -0.98]} material={mats.carbon}>
                  <boxGeometry args={[0.6, 0.3, 0.04]} />
                </mesh>
              </Part>

              {/* REAR WING + crash structure → "SHIPPING & DELIVERY" */}
              <Part id="rearwing" explodeRef={explodeRef} onPart={onPart}>
                <mesh position={[-2.28, 0.45, 0]} rotation={[0, 0, -Math.PI / 2]} material={mats.carbon}>
                  <cylinderGeometry args={[0.07, 0.15, 0.85, 10]} />
                </mesh>
                <mesh position={[-2.25, 1.12, 0]} rotation={[0, 0, -0.18]} material={mats.livery} castShadow>
                  <boxGeometry args={[0.5, 0.05, 1.5]} />
                </mesh>
                <mesh position={[-2.32, 0.76, 0]} material={mats.carbon}>
                  <boxGeometry args={[0.36, 0.04, 1.3]} />
                </mesh>
                <mesh position={[-2.25, 0.94, 0.76]} material={mats.carbon}>
                  <boxGeometry args={[0.75, 0.52, 0.045]} />
                </mesh>
                <mesh position={[-2.25, 0.94, -0.76]} material={mats.carbon}>
                  <boxGeometry args={[0.75, 0.52, 0.045]} />
                </mesh>
                {/* endplate number decals */}
                <mesh position={[-2.25, 0.96, 0.785]}>
                  <planeGeometry args={[0.5, 0.3]} />
                  {decal(numSmallTex)}
                </mesh>
                <mesh position={[-2.25, 0.96, -0.785]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[0.5, 0.3]} />
                  {decal(numSmallTex)}
                </mesh>
                {/* rain light — blinks under braking */}
                <mesh position={[-2.6, 0.48, 0]}>
                  <boxGeometry args={[0.05, 0.2, 0.09]} />
                  <meshBasicMaterial ref={rainLightMat} color="#ff2a2a" transparent opacity={0.25} />
                </mesh>
              </Part>

              {/* exhaust glow on throttle */}
              <pointLight ref={exhaustLight} position={[-2.55, 0.55, 0]} color="#ff6a00" intensity={0} distance={2.6} decay={0} />
            </group>
          </group>

          {/* ── wheels (explode outward, pit-stop detachable) ── */}
          {wheels.map((wp, i) => (
            <Part
              key={i}
              id="wheels"
              explodeRef={explodeRef}
              offset={[wp.front ? 0.45 : -0.45, 0, Math.sign(wp.z) * 1.3]}
              onPart={onPart}
            >
              <group
                position={[wp.x, WHEEL_R, wp.z]}
                ref={(el) => {
                  pitRefs.current[i] = el;
                }}
              >
                {wp.front ? (
                  <group
                    ref={(el) => {
                      steerRefs.current[i] = el;
                    }}
                  >
                    <group
                      ref={(el) => {
                        spinRefs.current[i] = el;
                      }}
                    >
                      <WheelMeshes width={wp.w} tire={mats.tire} rim={mats.rim} ring={mats.ring} />
                    </group>
                  </group>
                ) : (
                  <group
                    ref={(el) => {
                      spinRefs.current[i] = el;
                    }}
                  >
                    <WheelMeshes width={wp.w} tire={mats.tire} rim={mats.rim} ring={mats.ring} />
                  </group>
                )}
              </group>
            </Part>
          ))}
        </group>

        {/* tyre smoke pool */}
        {particles.current.map((_, i) => (
          <sprite
            key={i}
            ref={(el) => {
              spriteRefs.current[i] = el;
            }}
            scale={[0.001, 0.001, 1]}
          >
            <spriteMaterial map={smokeTex} transparent opacity={0} depthWrite={false} />
          </sprite>
        ))}
      </group>
    </group>
  );
}
