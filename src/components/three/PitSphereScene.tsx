import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { projects, type Project } from "../../data/portfolio";
import { useApp } from "../../context/AppContext";
import ProjectCard3D from "./ProjectCard3D";

function InnerSphere({ accent }: { accent: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.015;
  });
  return (
    <mesh ref={ref} scale={[-1, 1, 1]}>
      <sphereGeometry args={[6.8, 64, 64]} />
      <meshStandardMaterial
        color="#0a0a0c"
        side={THREE.BackSide}
        metalness={0.4}
        roughness={0.85}
        emissive={accent}
        emissiveIntensity={0.03}
      />
    </mesh>
  );
}

function Gallery({
  onSelect,
}: {
  onSelect: (p: Project) => void;
}) {
  return (
    <group>
      {projects.map((p, i) => (
        <Suspense key={p.name} fallback={null}>
          <ProjectCard3D project={p} index={i} total={projects.length} onSelect={onSelect} />
        </Suspense>
      ))}
    </group>
  );
}

export default function PitSphereScene({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: (p: Project) => void;
}) {
  const { accent } = useApp();

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 0.1], fov: 70 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
      }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 2, 0]} intensity={1.2} color={accent} />
      <pointLight position={[4, -2, 3]} intensity={0.5} color="#7d9bff" />

      <Suspense fallback={null}>
        <InnerSphere accent={accent} />
        <Gallery onSelect={onSelect} />
        <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.4} />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.45}
        dampingFactor={0.06}
        enableDamping
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI - 0.2}
      />
    </Canvas>
  );
}
