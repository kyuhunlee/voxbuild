"use client";

import { RoundedBox } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";

type Vector3 = [number, number, number];
type Category = "sofa" | "table" | "chair" | "lamp" | "plant" | "rug" | "desk";

interface FurnitureProps {
  category: Category;
  dimensions: Vector3;
  color: string;
}

type BlockProps = {
  size: Vector3;
  position?: Vector3;
  color: string;
  radius?: number;
  roughness?: number;
  metalness?: number;
} & Pick<ThreeElements["mesh"], "rotation">;

function Block({ size, position, color, radius = 0.035, rotation, roughness = 0.82, metalness = 0 }: BlockProps) {
  return (
    <RoundedBox args={size} position={position} rotation={rotation} radius={Math.min(radius, ...size.map((v) => v / 2 - 0.001))} smoothness={3} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </RoundedBox>
  );
}

function Leg({ position, height, radius = 0.025, color = "#77513a" }: { position: Vector3; height: number; radius?: number; color?: string }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[radius, radius * 0.75, height, 8]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}

function Sofa({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  const arm = Math.min(0.18, w * 0.085);
  const seatWidth = (w - arm * 2 - 0.035) / 2;
  return (
    <group>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * (w / 2 - 0.15), h * 0.09, z * (d / 2 - 0.13)]} height={h * 0.18} radius={0.035} color="#533a2c" />))}
      <Block size={[w - 0.05, h * 0.26, d - 0.045]} position={[0, h * 0.27, 0]} color={color} radius={0.07} />
      <Block size={[w - 0.08, h * 0.66, d * 0.22]} position={[0, h * 0.66, -d * 0.37]} color={color} radius={0.07} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block size={[arm, h * 0.55, d * 0.93]} position={[side * (w - arm) / 2, h * 0.49, 0]} color={color} radius={0.06} />
          <Block size={[seatWidth, h * 0.2, d * 0.7]} position={[side * (seatWidth / 2 + 0.009), h * 0.47, d * 0.08]} color={color} radius={0.065} />
          <Block size={[seatWidth * 0.96, h * 0.44, d * 0.18]} position={[side * (seatWidth / 2 + 0.009), h * 0.75, -d * 0.26]} rotation={[-0.09, 0, 0]} color={color} radius={0.075} />
        </group>
      ))}
      <Block size={[w * 0.17, h * 0.36, d * 0.13]} position={[-w * 0.31, h * 0.67, -d * 0.07]} rotation={[-0.19, -0.12, 0.13]} color="#e5d7c4" radius={0.065} />
      <Block size={[w * 0.16, h * 0.33, d * 0.13]} position={[w * 0.3, h * 0.65, -d * 0.07]} rotation={[-0.19, 0.12, -0.17]} color="#9b654c" radius={0.065} />
      <Block size={[w * 0.17, 0.018, d * 0.46]} position={[w * 0.22, h * 0.582, d * 0.19]} color="#c3b8a3" radius={0.008} />
    </group>
  );
}

function Table({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return (
    <group>
      <Block size={[w, Math.min(0.075, h * 0.17), d]} position={[0, h - 0.0375, 0]} color={color} radius={0.12} roughness={0.62} />
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.34, (h - 0.075) / 2, z * d * 0.31]} height={h - 0.075} radius={0.042} color={color} />))}
      <Block size={[w * 0.25, 0.034, d * 0.36]} position={[-w * 0.18, h + 0.018, d * 0.07]} rotation={[0, -0.12, 0]} color="#e0d6c3" radius={0.004} />
      <Block size={[w * 0.24, 0.024, d * 0.35]} position={[-w * 0.18, h + 0.046, d * 0.07]} rotation={[0, 0.06, 0]} color="#53685d" radius={0.004} />
      <mesh position={[w * 0.24, h + 0.044, -d * 0.1]} castShadow>
        <cylinderGeometry args={[0.085, 0.065, 0.085, 24]} />
        <meshStandardMaterial color="#d2bc9e" roughness={0.9} />
      </mesh>
      <mesh position={[w * 0.24, h + 0.089, -d * 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.069, 24]} />
        <meshStandardMaterial color="#4d3624" side={2} />
      </mesh>
    </group>
  );
}

function Chair({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return (
    <group>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.34, h * 0.22, z * d * 0.33]} height={h * 0.44} radius={0.029} />))}
      <Block size={[w * 0.92, h * 0.12, d * 0.92]} position={[0, h * 0.48, 0]} color={color} radius={0.075} />
      {[-1, 1].map((x) => <Block key={x} size={[0.04, h * 0.56, 0.05]} position={[x * w * 0.36, h * 0.7, -d * 0.38]} rotation={[-0.08, 0, 0]} color="#77513a" radius={0.012} />)}
      <Block size={[w, h * 0.32, d * 0.17]} position={[0, h * 0.84, -d * 0.37]} rotation={[-0.08, 0, 0]} color={color} radius={0.07} />
    </group>
  );
}

function Lamp({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return (
    <group>
      <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.32, w * 0.34, 0.07, 32]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.55} />
      </mesh>
      <Leg position={[0, h * 0.43, 0]} height={h * 0.84} radius={0.018} color={color} />
      <mesh position={[0, h * 0.86, 0]} castShadow>
        <cylinderGeometry args={[w * 0.29, w * 0.49, h * 0.27, 32, 1, true]} />
        <meshStandardMaterial color="#eee0c7" roughness={1} side={2} emissive="#d5b782" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, h * 0.731, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.min(w, d) * 0.46, 32]} />
        <meshStandardMaterial color="#f9e8c5" emissive="#edc894" emissiveIntensity={0.6} side={2} />
      </mesh>
      <pointLight position={[0, h * 0.72, 0]} color="#ffdba7" intensity={1.3} distance={3.2} decay={2} />
    </group>
  );
}

function Plant({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  const potHeight = h * 0.26;
  const spread = Math.min(w, d);
  return (
    <group>
      <mesh position={[0, potHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[spread * 0.26, spread * 0.19, potHeight, 32]} />
        <meshStandardMaterial color={color} roughness={0.93} />
      </mesh>
      <mesh position={[0, potHeight + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[spread * 0.245, 32]} />
        <meshStandardMaterial color="#42372a" />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
        const angle = index * 2.39996;
        const tier = index / 9;
        const leafHeight = h * (0.46 + tier * 0.46);
        const x = Math.cos(angle) * spread * (0.18 + tier * 0.1);
        const z = Math.sin(angle) * spread * (0.18 + tier * 0.1);
        return (
          <group key={index}>
            <mesh position={[x / 2, (leafHeight + potHeight) / 2, z / 2]} rotation={[Math.atan2(z, leafHeight - potHeight), 0, -Math.atan2(x, leafHeight - potHeight)]} castShadow>
              <cylinderGeometry args={[0.008, 0.012, leafHeight - potHeight, 5]} />
              <meshStandardMaterial color="#5c6640" />
            </mesh>
            <mesh position={[x, leafHeight, z]} rotation={[0.55, -angle, 0.5]} scale={[spread * 0.12, h * 0.14, spread * 0.04]} castShadow>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color={index % 3 === 0 ? "#718654" : index % 3 === 1 ? "#536f41" : "#365637"} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Rug({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  const top = Math.max(h, 0.015);
  return (
    <group>
      <Block size={[w, top, d]} position={[0, top / 2, 0]} color={color} radius={0.012} roughness={1} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block size={[w - 0.12, 0.002, 0.013]} position={[0, top + 0.002, side * (d / 2 - 0.12)]} color="#a1917b" radius={0.0003} />
          <Block size={[w - 0.12, 0.002, 0.008]} position={[0, top + 0.002, side * (d / 2 - 0.155)]} color="#a1917b" radius={0.0003} />
          {Array.from({ length: 17 }, (_, index) => <Block key={index} size={[0.009, 0.005, 0.055]} position={[(index / 16 - 0.5) * (w - 0.07), top / 2, side * (d / 2 + 0.018)]} color={color} radius={0.001} />)}
        </group>
      ))}
      {Array.from({ length: 12 }, (_, index) => <mesh key={index} position={[0, top + 0.001, (index / 11 - 0.5) * (d - 0.4)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.14, 0.004]} />
        <meshStandardMaterial color="#998971" transparent opacity={0.14} roughness={1} depthWrite={false} />
      </mesh>)}
    </group>
  );
}

function Desk({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return (
    <group>
      <Block size={[w, 0.065, d]} position={[0, h - 0.0325, 0]} color={color} radius={0.025} roughness={0.65} />
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.43, (h - 0.065) / 2, z * d * 0.37]} height={h - 0.065} radius={0.027} color="#3d4240" />))}
      <Block size={[w * 0.3, 0.13, d * 0.65]} position={[w * 0.3, h - 0.12, 0]} color={color} radius={0.008} />
      <Block size={[w * 0.12, 0.012, 0.016]} position={[w * 0.3, h - 0.12, d * 0.33]} color="#514738" radius={0.004} />
      <Block size={[0.4, 0.017, 0.28]} position={[-w * 0.09, h + 0.009, 0.035]} color="#9b9fa0" radius={0.01} metalness={0.6} />
      <Block size={[0.39, 0.25, 0.016]} position={[-w * 0.09, h + 0.13, -0.105]} rotation={[-0.12, 0, 0]} color="#454b4c" radius={0.008} metalness={0.3} />
      <Block size={[0.355, 0.211, 0.002]} position={[-w * 0.09, h + 0.132, -0.088]} rotation={[-0.12, 0, 0]} color="#92aaa8" radius={0.002} />
      <Block size={[0.18, 0.02, 0.24]} position={[w * 0.32, h + 0.011, 0.07]} rotation={[0, -0.15, 0]} color="#e7decb" radius={0.003} />
    </group>
  );
}

export default function Furniture({ category, dimensions, color }: FurnitureProps) {
  const props = { dimensions, color };
  switch (category) {
    case "sofa": return <Sofa {...props} />;
    case "table": return <Table {...props} />;
    case "chair": return <Chair {...props} />;
    case "lamp": return <Lamp {...props} />;
    case "plant": return <Plant {...props} />;
    case "rug": return <Rug {...props} />;
    case "desk": return <Desk {...props} />;
  }
}
