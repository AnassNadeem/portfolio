import { Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { useApp } from "../../context/AppContext";
import F1Car from "./F1Car";

/** TV crane shot ⇄ onboard halo cam (toggled from HUD / palette / cheat) */
function CameraRig({ mode }: { mode: "tv" | "onboard" }) {
  useFrame(({ camera, pointer, clock }) => {
    if (mode === "onboard") {
      const sway = Math.sin(clock.elapsedTime * 18) * 0.012;
      camera.position.x += (0.18 - camera.position.x) * 0.08;
      camera.position.y += (1.06 + sway - camera.position.y) * 0.08;
      camera.position.z += (0 + pointer.x * 0.1 - camera.position.z) * 0.08;
      camera.lookAt(8, 0.55 - pointer.y * 0.4, pointer.x * 2.2);
    } else {
      camera.position.x += (4.6 + pointer.x * 0.6 - camera.position.x) * 0.04;
      camera.position.y += (1.75 - pointer.y * 0.32 - camera.position.y) * 0.04;
      camera.position.z += (6.9 - camera.position.z) * 0.04;
      camera.lookAt(0.25, 0.5, 0);
    }
  });
  return null;
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
      <planeGeometry args={[44, 44]} />
      <MeshReflectorMaterial
        blur={[280, 90]}
        resolution={640}
        mixBlur={1}
        mixStrength={14}
        roughness={0.92}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        color="#07070a"
        metalness={0.55}
      />
    </mesh>
  );
}

function GridSlot() {
  return (
    <group position={[0.1, 0.012, 0]}>
      <mesh position={[0, 0, 1.3]}>
        <boxGeometry args={[3.6, 0.012, 0.07]} />
        <meshBasicMaterial color="#f5f5f7" transparent opacity={0.16} />
      </mesh>
      <mesh position={[0, 0, -1.3]}>
        <boxGeometry args={[3.6, 0.012, 0.07]} />
        <meshBasicMaterial color="#f5f5f7" transparent opacity={0.16} />
      </mesh>
      <mesh position={[1.95, 0, 0]}>
        <boxGeometry args={[0.07, 0.012, 2.67]} />
        <meshBasicMaterial color="#f5f5f7" transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

export default function HeroScene({ active }: { active: boolean }) {
  const { accent, camMode } = useApp();

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [4.6, 1.75, 6.9], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        // Request context restoration on loss rather than leaving a black canvas
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
      }}
    >
      <fog attach="fog" args={["#0a0a0c", 10, 26]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3.5, 6.5, 2.5]} intensity={1.7} color="#ffffff" />
      <pointLight position={[-6, 2.6, -4]} intensity={3.2} color={accent} decay={0} />
      <pointLight position={[5, 1.4, 5]} intensity={0.45} color="#7d9bff" decay={0} />

      <Suspense fallback={null}>
        <Environment resolution={256}>
          <Lightformer intensity={2.6} position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[11, 3, 1]} form="rect" />
          <Lightformer intensity={0.9} position={[-6, 2, 3]} rotation={[0, Math.PI / 3, 0]} scale={[4, 1.2, 1]} form="rect" />
          <Lightformer intensity={0.7} position={[7, 2.5, -2]} rotation={[0, -Math.PI / 2.6, 0]} scale={[4, 1, 1]} form="rect" />
          <Lightformer intensity={0.4} position={[0, 1.4, 9]} scale={[10, 1, 1]} form="rect" />
        </Environment>

        <F1Car mode="hero" />
        <Floor />
        <GridSlot />
        <ContactShadows position={[0, 0.005, 0]} opacity={0.72} scale={13} blur={2.4} far={2.2} resolution={512} />
      </Suspense>

      <CameraRig mode={camMode} />
    </Canvas>
  );
}
