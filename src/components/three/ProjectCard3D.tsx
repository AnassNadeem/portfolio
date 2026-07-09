import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import type { Project } from "../../data/portfolio";
import { useApp } from "../../context/AppContext";

function cardPosition(i: number, total: number, radius: number): [number, number, number] {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.55,
    radius * Math.cos(phi),
  ];
}

function CardPlane({
  project,
  position,
  onSelect,
}: {
  project: Project;
  position: [number, number, number];
  onSelect: (p: Project) => void;
}) {
  const { accent } = useApp();
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const tex = useTexture(project.image ?? "/projects/portfolio.png");

  useFrame(() => {
    if (!ref.current) return;
    ref.current.lookAt(0, 0, 0);
    const s = hovered ? 1.12 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(project);
  };

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ""; }}
      >
        <planeGeometry args={[2.4, 1.5]} />
        <meshStandardMaterial
          map={tex}
          emissive={accent}
          emissiveIntensity={hovered ? 0.35 : 0.05}
          metalness={0.2}
          roughness={0.65}
        />
      </mesh>
      <Text
        position={[0, -0.95, 0.02]}
        fontSize={0.18}
        color="#f5f5f7"
        anchorX="center"
        anchorY="top"
        maxWidth={2.2}
      >
        {project.name}
      </Text>
      {hovered && (
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[2.5, 1.6]} />
          <meshBasicMaterial color={accent} transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}

/** Fallback card without image texture */
function CardFallback({
  project,
  position,
  onSelect,
}: {
  project: Project;
  position: [number, number, number];
  onSelect: (p: Project) => void;
}) {
  const { accent } = useApp();
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.lookAt(0, 0, 0);
  });

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onSelect(project); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[2.4, 1.5]} />
        <meshStandardMaterial
          color="#16161c"
          emissive={accent}
          emissiveIntensity={hovered ? 0.4 : 0.1}
        />
      </mesh>
      <Text position={[0, 0, 0.05]} fontSize={0.22} color="#f5f5f7" anchorX="center" anchorY="middle">
        {project.name}
      </Text>
    </group>
  );
}

export default function ProjectCard3D({
  project,
  index,
  total,
  onSelect,
}: {
  project: Project;
  index: number;
  total: number;
  onSelect: (p: Project) => void;
}) {
  const pos = useMemo(() => cardPosition(index, total, 5.2), [index, total]);
  if (project.image) {
    return <CardPlane project={project} position={pos} onSelect={onSelect} />;
  }
  return <CardFallback project={project} position={pos} onSelect={onSelect} />;
}
