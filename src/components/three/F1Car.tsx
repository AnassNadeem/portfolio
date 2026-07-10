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

/** 18-inch style wheel: slick tire, deep-dish rim, radial spokes, compound ring */
function WheelMeshes({
  width,
  tire,
  rim,
  rimDark,
  ring,
  accentMat,
}: {
  width: number;
  tire: THREE.Material;
  rim: THREE.Material;
  rimDark: THREE.Material;
  ring: THREE.Material;
  accentMat: THREE.Material;
}) {
  const spokes = useMemo(() => {
    const arr: { rot: number }[] = [];
    for (let i = 0; i < 6; i++) arr.push({ rot: (i / 6) * Math.PI * 2 });
    return arr;
  }, []);
  return (
    <>
      {/* tire */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={tire} castShadow>
        <cylinderGeometry args={[WHEEL_R, WHEEL_R, width, 32]} />
      </mesh>
      {/* rounded shoulders */}
      <mesh position={[0, 0, width / 2 - 0.035]} material={tire}>
        <torusGeometry args={[WHEEL_R - 0.035, 0.038, 8, 32]} />
      </mesh>
      <mesh position={[0, 0, -(width / 2 - 0.035)]} material={tire}>
        <torusGeometry args={[WHEEL_R - 0.035, 0.038, 8, 32]} />
      </mesh>
      {/* rim barrel */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={rimDark}>
        <cylinderGeometry args={[WHEEL_R * 0.62, WHEEL_R * 0.62, width * 0.94, 24]} />
      </mesh>
      {/* outer rim lips */}
      <mesh position={[0, 0, width / 2 - 0.008]} material={rim}>
        <torusGeometry args={[WHEEL_R * 0.6, 0.02, 6, 28]} />
      </mesh>
      <mesh position={[0, 0, -(width / 2 - 0.008)]} material={rim}>
        <torusGeometry args={[WHEEL_R * 0.6, 0.02, 6, 28]} />
      </mesh>
      {/* radial spokes, both faces */}
      {spokes.map((s, i) => (
        <group key={i} rotation={[0, 0, s.rot]}>
          <mesh position={[0, WHEEL_R * 0.31, width / 2 - 0.03]} material={rim}>
            <boxGeometry args={[0.045, WHEEL_R * 0.52, 0.035]} />
          </mesh>
          <mesh position={[0, WHEEL_R * 0.31, -(width / 2 - 0.03)]} material={rim}>
            <boxGeometry args={[0.045, WHEEL_R * 0.52, 0.035]} />
          </mesh>
        </group>
      ))}
      {/* center-lock nut */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={accentMat}>
        <cylinderGeometry args={[0.075, 0.075, width + 0.06, 12]} />
      </mesh>
      {/* tyre-compound rings */}
      <mesh position={[0, 0, width / 2 + 0.004]} material={ring}>
        <torusGeometry args={[WHEEL_R * 0.82, 0.014, 6, 44]} />
      </mesh>
      <mesh position={[0, 0, -(width / 2 + 0.004)]} material={ring}>
        <torusGeometry args={[WHEEL_R * 0.82, 0.014, 6, 44]} />
      </mesh>
    </>
  );
}

function Strut({
  from,
  to,
  material,
  radius = 0.022,
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
      {/* aero-profile wishbone: flattened cylinder reads as an airfoil */}
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
    // Clearcoat paint — reads as real automotive lacquer under the lightformers
    const livery = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(accent),
      metalness: 0.72,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
    const liveryDark = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(accent).multiplyScalar(0.55),
      metalness: 0.7,
      roughness: 0.38,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    });
    const carbon = new THREE.MeshStandardMaterial({ color: "#141419", metalness: 0.46, roughness: 0.42 });
    const dark = new THREE.MeshStandardMaterial({ color: "#0d0d10", metalness: 0.32, roughness: 0.44 });
    const tire = new THREE.MeshStandardMaterial({ color: "#0b0b0d", metalness: 0, roughness: 0.95 });
    const rim = new THREE.MeshStandardMaterial({ color: "#2e2e38", metalness: 0.92, roughness: 0.26 });
    const rimDark = new THREE.MeshStandardMaterial({ color: "#17171c", metalness: 0.85, roughness: 0.35 });
    const ring = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) });
    const accentMetal = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent),
      metalness: 0.9,
      roughness: 0.3,
    });
    const helmet = new THREE.MeshPhysicalMaterial({
      color: "#f5f5f7",
      metalness: 0.35,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const visor = new THREE.MeshStandardMaterial({ color: "#0a0a0e", metalness: 1, roughness: 0.08 });
    return { livery, liveryDark, carbon, dark, tire, rim, rimDark, ring, accentMetal, helmet, visor };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = new THREE.Color(accent);
    const cd = new THREE.Color(accent).multiplyScalar(0.55);
    gsap.to(mats.livery.color, { r: c.r, g: c.g, b: c.b, duration: 0.6, ease: "power2.out" });
    gsap.to(mats.liveryDark.color, { r: cd.r, g: cd.g, b: cd.b, duration: 0.6, ease: "power2.out" });
    gsap.to(mats.ring.color, { r: c.r, g: c.g, b: c.b, duration: 0.6, ease: "power2.out" });
    gsap.to(mats.accentMetal.color, { r: c.r, g: c.g, b: c.b, duration: 0.6, ease: "power2.out" });
  }, [accent, mats]);

  /* ── sculpted geometry (all procedural, no assets) ── */
  const geo = useMemo(() => {
    // Wide flat shovel nose — no pointed peak at the tip
    const nosePts: THREE.Vector2[] = [
      new THREE.Vector2(0.11, 0),
      new THREE.Vector2(0.11, 0.22),
      new THREE.Vector2(0.1, 0.48),
      new THREE.Vector2(0.085, 0.68),
    ];
    const nose = new THREE.LatheGeometry(nosePts, 20);

    // Coke-bottle engine cover — lathe, squashed sideways
    const coverPts: THREE.Vector2[] = [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.09, 0.3),
      new THREE.Vector2(0.17, 0.75),
      new THREE.Vector2(0.24, 1.3),
      new THREE.Vector2(0.28, 1.85),
    ];
    const cover = new THREE.LatheGeometry(coverPts, 18);

    // Halo — swept tube on a closed loop around the cockpit
    const haloCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.05, 1.04, 0.0),
        new THREE.Vector3(0.18, 1.03, 0.4),
        new THREE.Vector3(0.6, 0.99, 0.45),
        new THREE.Vector3(0.95, 0.93, 0.0),
        new THREE.Vector3(0.6, 0.99, -0.45),
        new THREE.Vector3(0.18, 1.03, -0.4),
      ],
      true,
      "catmullrom",
      0.35
    );
    const halo = new THREE.TubeGeometry(haloCurve, 48, 0.036, 10, true);

    // Sidepod — extruded rounded profile with undercut
    const podShape = new THREE.Shape();
    podShape.moveTo(0, 0.06); // bottom front (undercut lifted off floor)
    podShape.lineTo(0.05, 0.42); // inlet face
    podShape.bezierCurveTo(-0.35, 0.48, -1.1, 0.42, -1.7, 0.18); // downwash top line
    podShape.lineTo(-1.7, 0.1);
    podShape.bezierCurveTo(-1.1, 0.02, -0.45, 0.0, 0, 0.06); // belly
    const pod = new THREE.ExtrudeGeometry(podShape, {
      depth: 0.52,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 3,
    });

    return { nose, cover, halo, pod };
  }, []);

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

  /** One sidepod assembly (sign = ±1 for left/right) */
  const sidepod = (sign: number) => (
    <group>
      {/* sculpted pod body — extruded undercut profile */}
      <mesh
        geometry={geo.pod}
        material={mats.livery}
        position={[0.72, 0.18, sign * 0.42 - (sign > 0 ? 0 : 0.52)]}
        castShadow
      />
      {/* radiator inlet — dark, high on the pod face */}
      <mesh position={[0.78, 0.5, sign * 0.68]} material={mats.dark}>
        <boxGeometry args={[0.1, 0.24, 0.42]} />
      </mesh>
      {/* inlet lip */}
      <mesh position={[0.82, 0.64, sign * 0.68]} material={mats.liveryDark}>
        <boxGeometry args={[0.14, 0.05, 0.48]} />
      </mesh>
      {/* undercut shadow panel */}
      <mesh position={[0.45, 0.22, sign * 0.58]} material={mats.carbon}>
        <boxGeometry args={[0.7, 0.22, 0.3]} />
      </mesh>
      {/* driver name decal along the pod flank */}
      <mesh
        position={[0.05, 0.42, sign * 0.985]}
        rotation={[0, sign > 0 ? 0 : Math.PI, sign > 0 ? -0.045 : 0.045]}
      >
        <planeGeometry args={[1.35, 0.24]} />
        {decal(nameTex)}
      </mesh>
    </group>
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
                {/* wide ground-effect floor */}
                <mesh position={[0.05, 0.15, 0]} material={mats.dark} castShadow>
                  <boxGeometry args={[4.2, 0.06, 1.5]} />
                </mesh>
                {/* floor edge wings */}
                <mesh position={[0.35, 0.2, 0.79]} material={mats.carbon}>
                  <boxGeometry args={[2.1, 0.025, 0.09]} />
                </mesh>
                <mesh position={[0.35, 0.2, -0.79]} material={mats.carbon}>
                  <boxGeometry args={[2.1, 0.025, 0.09]} />
                </mesh>
                {/* plank / skid block */}
                <mesh position={[0.2, 0.11, 0]} material={mats.carbon}>
                  <boxGeometry args={[3.0, 0.03, 0.42]} />
                </mesh>
                {/* bargeboard blades at the pod inlets */}
                <mesh position={[1.06, 0.3, 0.62]} rotation={[0, 0.5, 0]} material={mats.carbon}>
                  <boxGeometry args={[0.3, 0.24, 0.02]} />
                </mesh>
                <mesh position={[1.06, 0.3, -0.62]} rotation={[0, -0.5, 0]} material={mats.carbon}>
                  <boxGeometry args={[0.3, 0.24, 0.02]} />
                </mesh>
                {/* pushrod suspension — front */}
                <Strut from={[1.5, 0.56, 0.24]} to={[1.78, 0.5, 0.72]} material={mats.carbon} />
                <Strut from={[1.5, 0.56, -0.24]} to={[1.78, 0.5, -0.72]} material={mats.carbon} />
                <Strut from={[1.32, 0.3, 0.24]} to={[1.78, 0.34, 0.72]} material={mats.carbon} />
                <Strut from={[1.32, 0.3, -0.24]} to={[1.78, 0.34, -0.72]} material={mats.carbon} />
                <Strut from={[1.62, 0.3, 0.24]} to={[1.86, 0.42, 0.7]} material={mats.carbon} radius={0.016} />
                <Strut from={[1.62, 0.3, -0.24]} to={[1.86, 0.42, -0.7]} material={mats.carbon} radius={0.016} />
                {/* rear */}
                <Strut from={[-1.42, 0.56, 0.22]} to={[-1.72, 0.48, 0.74]} material={mats.carbon} />
                <Strut from={[-1.42, 0.56, -0.22]} to={[-1.72, 0.48, -0.74]} material={mats.carbon} />
                <Strut from={[-1.42, 0.3, 0.22]} to={[-1.72, 0.34, 0.74]} material={mats.carbon} />
                <Strut from={[-1.42, 0.3, -0.22]} to={[-1.72, 0.34, -0.74]} material={mats.carbon} />
              </Part>

              {/* NOSE + MONOCOQUE → "CORE LANGUAGES" */}
              <Part id="nose" explodeRef={explodeRef} onPart={onPart}>
                {/* blunt shovel nose — flat tip, no needle peak */}
                <mesh
                  geometry={geo.nose}
                  position={[2.08, 0.42, 0]}
                  rotation={[0, 0, -Math.PI / 2 - 0.04]}
                  scale={[1, 1, 1.22]}
                  material={mats.livery}
                  castShadow
                />
                {/* monocoque tub */}
                <mesh position={[0.62, 0.5, 0]} material={mats.livery} castShadow>
                  <boxGeometry args={[1.7, 0.4, 0.64]} />
                </mesh>
                <mesh position={[1.22, 0.51, 0]} rotation={[0, 0, -0.02]} scale={[1, 0.88, 0.88]} material={mats.livery}>
                  <boxGeometry args={[0.72, 0.38, 0.64]} />
                </mesh>
                {/* raised cockpit sides */}
                <mesh position={[0.32, 0.74, 0.24]} material={mats.livery}>
                  <boxGeometry args={[0.85, 0.14, 0.16]} />
                </mesh>
                <mesh position={[0.32, 0.74, -0.24]} material={mats.livery}>
                  <boxGeometry args={[0.85, 0.14, 0.16]} />
                </mesh>
                {/* cockpit opening */}
                <mesh position={[0.42, 0.74, 0]} material={mats.dark}>
                  <boxGeometry args={[0.72, 0.1, 0.34]} />
                </mesh>
                {/* headrest */}
                <mesh position={[0.06, 0.79, 0]} material={mats.liveryDark}>
                  <boxGeometry args={[0.26, 0.12, 0.4]} />
                </mesh>
                {/* driver helmet + visor */}
                <mesh position={[0.36, 0.83, 0]} material={mats.helmet} castShadow>
                  <sphereGeometry args={[0.13, 20, 16]} />
                </mesh>
                <mesh position={[0.47, 0.84, 0]} rotation={[0, 0, -0.2]} material={mats.visor}>
                  <boxGeometry args={[0.05, 0.07, 0.16]} />
                </mesh>
                {/* wing mirrors on stalks */}
                <mesh position={[0.88, 0.86, 0.46]} material={mats.carbon}>
                  <boxGeometry args={[0.11, 0.06, 0.15]} />
                </mesh>
                <mesh position={[0.88, 0.86, -0.46]} material={mats.carbon}>
                  <boxGeometry args={[0.11, 0.06, 0.15]} />
                </mesh>
                <Strut from={[0.88, 0.72, 0.32]} to={[0.88, 0.84, 0.44]} material={mats.carbon} radius={0.012} />
                <Strut from={[0.88, 0.72, -0.32]} to={[0.88, 0.84, -0.44]} material={mats.carbon} radius={0.012} />
                {/* race number on the nose */}
                <mesh position={[1.78, 0.63, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                  <planeGeometry args={[0.42, 0.42]} />
                  <meshBasicMaterial map={numberTex} transparent depthWrite={false} />
                </mesh>
              </Part>

              {/* HALO → "TESTING & SAFETY" */}
              <Part id="halo" explodeRef={explodeRef} onPart={onPart}>
                <mesh geometry={geo.halo} material={mats.carbon} castShadow />
                {/* central front pylon */}
                <Strut from={[0.95, 0.93, 0]} to={[0.98, 0.6, 0]} material={mats.carbon} radius={0.026} />
              </Part>

              {/* ENGINE COVER + airbox + fin → "AI & DATA" */}
              <Part id="power" explodeRef={explodeRef} onPart={onPart}>
                {/* coke-bottle spine tapering to the tail */}
                <mesh
                  geometry={geo.cover}
                  position={[-1.95, 0.72, 0]}
                  rotation={[0, 0, -Math.PI / 2 + 0.045]}
                  scale={[1, 1, 0.78]}
                  material={mats.livery}
                  castShadow
                />
                {/* airbox intake over the cockpit */}
                <mesh position={[-0.02, 1.02, 0]} rotation={[0, 0, -Math.PI / 2]} material={mats.livery}>
                  <cylinderGeometry args={[0.15, 0.19, 0.4, 14]} />
                </mesh>
                <mesh position={[0.19, 1.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
                  <cylinderGeometry args={[0.115, 0.115, 0.03, 14]} />
                </mesh>
                {/* roll hoop blade */}
                <mesh position={[-0.14, 1.16, 0]} rotation={[0, 0, 0.25]} material={mats.carbon}>
                  <boxGeometry args={[0.34, 0.1, 0.05]} />
                </mesh>
                {/* shark fin */}
                <mesh position={[-1.45, 1.0, 0]} rotation={[0, 0, 0.1]} material={mats.livery}>
                  <boxGeometry args={[1.1, 0.42, 0.028]} />
                </mesh>
                {/* number decals on the fin */}
                <mesh position={[-1.45, 1.02, 0.02]} rotation={[0, 0, 0.1]}>
                  <planeGeometry args={[0.44, 0.28]} />
                  {decal(numSmallTex)}
                </mesh>
                <mesh position={[-1.45, 1.02, -0.02]} rotation={[0, Math.PI, -0.1]}>
                  <planeGeometry args={[0.44, 0.28]} />
                  {decal(numSmallTex)}
                </mesh>
                {/* T-cam */}
                <mesh position={[-0.02, 1.27, 0]} material={mats.accentMetal}>
                  <boxGeometry args={[0.15, 0.09, 0.11]} />
                </mesh>
                {/* exhaust tip */}
                <mesh position={[-2.16, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
                  <cylinderGeometry args={[0.05, 0.06, 0.22, 12]} />
                </mesh>
              </Part>

              {/* SIDEPODS → "APIs & SERVICES" */}
              <Part id="sidepods" explodeRef={explodeRef} offset={[0, 0, 1.15]} onPart={onPart}>
                {sidepod(1)}
              </Part>
              <Part id="sidepods" explodeRef={explodeRef} offset={[0, 0, -1.15]} onPart={onPart}>
                {sidepod(-1)}
              </Part>

              {/* FRONT WING → "FRONTEND" */}
              <Part id="frontwing" explodeRef={explodeRef} onPart={onPart}>
                {/* flat wide front wing — low profile, no upward peak */}
                <mesh position={[2.22, 0.1, 0]} material={mats.carbon} castShadow>
                  <boxGeometry args={[0.48, 0.028, 2.0]} />
                </mesh>
                <mesh position={[2.16, 0.14, 0]} rotation={[0, 0, 0.06]} material={mats.livery}>
                  <boxGeometry args={[0.38, 0.026, 1.92]} />
                </mesh>
                <mesh position={[2.12, 0.18, 0]} rotation={[0, 0, 0.1]} material={mats.carbon}>
                  <boxGeometry args={[0.3, 0.022, 1.78]} />
                </mesh>
                {/* endplates */}
                <mesh position={[2.18, 0.2, 1.0]} rotation={[0, 0.12, 0]} material={mats.carbon}>
                  <boxGeometry args={[0.52, 0.28, 0.035]} />
                </mesh>
                <mesh position={[2.18, 0.2, -1.0]} rotation={[0, -0.12, 0]} material={mats.carbon}>
                  <boxGeometry args={[0.52, 0.28, 0.035]} />
                </mesh>
                <mesh position={[2.16, 0.32, 0.94]} rotation={[0.35, 0.12, 0]} material={mats.liveryDark}>
                  <boxGeometry args={[0.42, 0.02, 0.14]} />
                </mesh>
                <mesh position={[2.16, 0.32, -0.94]} rotation={[-0.35, -0.12, 0]} material={mats.liveryDark}>
                  <boxGeometry args={[0.42, 0.02, 0.14]} />
                </mesh>
                <Strut from={[2.2, 0.28, 0.1]} to={[2.22, 0.12, 0.1]} material={mats.carbon} radius={0.018} />
                <Strut from={[2.2, 0.28, -0.1]} to={[2.22, 0.12, -0.1]} material={mats.carbon} radius={0.018} />
              </Part>

              {/* REAR WING + beam wing + diffuser → "SHIPPING & DELIVERY" */}
              <Part id="rearwing" explodeRef={explodeRef} onPart={onPart}>
                {/* endplates */}
                <mesh position={[-2.28, 0.92, 0.76]} material={mats.carbon} castShadow>
                  <boxGeometry args={[0.8, 0.62, 0.04]} />
                </mesh>
                <mesh position={[-2.28, 0.92, -0.76]} material={mats.carbon} castShadow>
                  <boxGeometry args={[0.8, 0.62, 0.04]} />
                </mesh>
                {/* main plane */}
                <mesh position={[-2.26, 1.02, 0]} rotation={[0, 0, -0.14]} material={mats.livery} castShadow>
                  <boxGeometry args={[0.44, 0.045, 1.5]} />
                </mesh>
                {/* DRS flap, opened slightly */}
                <mesh position={[-2.42, 1.16, 0]} rotation={[0, 0, -0.42]} material={mats.carbon}>
                  <boxGeometry args={[0.3, 0.032, 1.48]} />
                </mesh>
                {/* DRS actuator pod */}
                <mesh position={[-2.34, 1.13, 0]} material={mats.dark}>
                  <boxGeometry args={[0.16, 0.08, 0.1]} />
                </mesh>
                {/* swan-neck mounts */}
                <Strut from={[-1.86, 0.92, 0.22]} to={[-2.3, 1.2, 0.22]} material={mats.carbon} radius={0.02} />
                <Strut from={[-1.86, 0.92, -0.22]} to={[-2.3, 1.2, -0.22]} material={mats.carbon} radius={0.02} />
                {/* beam wing — two elements */}
                <mesh position={[-2.3, 0.62, 0]} rotation={[0, 0, -0.28]} material={mats.carbon}>
                  <boxGeometry args={[0.26, 0.03, 1.3]} />
                </mesh>
                <mesh position={[-2.38, 0.5, 0]} rotation={[0, 0, -0.14]} material={mats.liveryDark}>
                  <boxGeometry args={[0.24, 0.03, 1.3]} />
                </mesh>
                {/* diffuser — kicked-up expansion with strakes */}
                <mesh position={[-1.98, 0.26, 0]} rotation={[0, 0, -0.38]} material={mats.dark}>
                  <boxGeometry args={[0.66, 0.035, 1.34]} />
                </mesh>
                {[-0.45, -0.15, 0.15, 0.45].map((z) => (
                  <mesh key={z} position={[-2.02, 0.3, z]} rotation={[0, 0, -0.38]} material={mats.carbon}>
                    <boxGeometry args={[0.55, 0.16, 0.02]} />
                  </mesh>
                ))}
                {/* endplate number decals */}
                <mesh position={[-2.28, 0.94, 0.785]}>
                  <planeGeometry args={[0.5, 0.3]} />
                  {decal(numSmallTex)}
                </mesh>
                <mesh position={[-2.28, 0.94, -0.785]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[0.5, 0.3]} />
                  {decal(numSmallTex)}
                </mesh>
                {/* rain light — blinks under braking */}
                <mesh position={[-2.56, 0.44, 0]}>
                  <boxGeometry args={[0.05, 0.18, 0.08]} />
                  <meshBasicMaterial ref={rainLightMat} color="#ff2a2a" transparent opacity={0.25} />
                </mesh>
              </Part>

              {/* exhaust glow on throttle */}
              <pointLight ref={exhaustLight} position={[-2.4, 0.6, 0]} color="#ff6a00" intensity={0} distance={2.6} decay={0} />
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
                      <WheelMeshes
                        width={wp.w}
                        tire={mats.tire}
                        rim={mats.rim}
                        rimDark={mats.rimDark}
                        ring={mats.ring}
                        accentMat={mats.accentMetal}
                      />
                    </group>
                  </group>
                ) : (
                  <group
                    ref={(el) => {
                      spinRefs.current[i] = el;
                    }}
                  >
                    <WheelMeshes
                      width={wp.w}
                      tire={mats.tire}
                      rim={mats.rim}
                      rimDark={mats.rimDark}
                      ring={mats.ring}
                      accentMat={mats.accentMetal}
                    />
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
