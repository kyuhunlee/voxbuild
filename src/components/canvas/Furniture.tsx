"use client";

import { RoundedBox } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import type { CatalogItem } from "@/lib/schema";

type Vector3 = [number, number, number];
type Category = CatalogItem["category"];

interface FurnitureProps {
  category: Category;
  sku?: string;
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
    <RoundedBox args={size} position={position} rotation={rotation} radius={Math.max(0.0001, Math.min(radius, ...size.map((v) => v * 0.45)))} smoothness={3} castShadow receiveShadow>
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
  const tabletop = h - 0.09;
  return (
    <group>
      <Block size={[w, Math.min(0.075, h * 0.17), d]} position={[0, tabletop - Math.min(0.075, h * 0.17) / 2, 0]} color={color} radius={0.12} roughness={0.62} />
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.34, (tabletop - 0.065) / 2, z * d * 0.31]} height={tabletop - 0.065} radius={0.042} color={color} />))}
      <Block size={[w * 0.25, 0.034, d * 0.36]} position={[-w * 0.18, tabletop + 0.018, d * 0.07]} rotation={[0, -0.12, 0]} color="#e0d6c3" radius={0.004} />
      <Block size={[w * 0.24, 0.024, d * 0.35]} position={[-w * 0.18, tabletop + 0.046, d * 0.07]} rotation={[0, 0.06, 0]} color="#53685d" radius={0.004} />
      <mesh position={[w * 0.24, tabletop + 0.044, -d * 0.1]} castShadow>
        <cylinderGeometry args={[0.085, 0.065, 0.085, 24]} />
        <meshStandardMaterial color="#d2bc9e" roughness={0.9} />
      </mesh>
      <mesh position={[w * 0.24, tabletop + 0.089, -d * 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
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
      <Block size={[w, h * 0.32, d * 0.17]} position={[0, h * 0.83, -d * 0.37]} rotation={[-0.08, 0, 0]} color={color} radius={0.07} />
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
  const top = h - 0.003;
  return (
    <group>
      <Block size={[w, top, d]} position={[0, top / 2, 0]} color={color} radius={0.012} roughness={1} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block size={[w - 0.12, 0.002, 0.013]} position={[0, top + 0.002, side * (d / 2 - 0.12)]} color="#a1917b" radius={0.0003} />
          <Block size={[w - 0.12, 0.002, 0.008]} position={[0, top + 0.002, side * (d / 2 - 0.155)]} color="#a1917b" radius={0.0003} />
          {Array.from({ length: 17 }, (_, index) => <Block key={index} size={[0.009, 0.005, 0.055]} position={[(index / 16 - 0.5) * (w - 0.07), top / 2, side * (d / 2 - 0.0275)]} color={color} radius={0.001} />)}
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
  const tabletop = h - 0.022;
  return (
    <group>
      <Block size={[w, 0.065, d]} position={[0, tabletop - 0.0325, 0]} color={color} radius={0.025} roughness={0.65} />
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.43, (tabletop - 0.065) / 2, z * d * 0.37]} height={tabletop - 0.065} radius={0.027} color="#3d4240" />))}
      <Block size={[w * 0.3, 0.13, d * 0.65]} position={[w * 0.3, h - 0.12, 0]} color={color} radius={0.008} />
      <Block size={[w * 0.12, 0.012, 0.016]} position={[w * 0.3, h - 0.12, d * 0.33]} color="#514738" radius={0.004} />
      <Block size={[0.4, 0.017, 0.28]} position={[-w * 0.09, tabletop + 0.009, 0.035]} color="#9b9fa0" radius={0.008} metalness={0.6} />
      <Block size={[0.385, 0.003, 0.265]} position={[-w * 0.09, tabletop + 0.019, 0.035]} color="#667373" radius={0.001} metalness={0.3} />
      <Block size={[0.18, 0.02, 0.24]} position={[w * 0.32, tabletop + 0.011, 0.07]} rotation={[0, -0.15, 0]} color="#e7decb" radius={0.003} />
    </group>
  );
}

function Bed({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return <group>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.39, h * 0.065, z * d * 0.39]} height={h * 0.13} radius={0.035} color="#665044" />))}
    <Block size={[w, h * 0.85, d * 0.075]} position={[0, h * 0.575, -d * 0.4625]} color={color} radius={0.075} />
    {[-1, 0, 1].map((channel) => <Block key={channel} size={[w * 0.28, h * 0.66, d * 0.018]} position={[channel * w * 0.31, h * 0.62, -d * 0.418]} color={color} radius={0.06} />)}
    <Block size={[w * 0.98, h * 0.25, d * 0.94]} position={[0, h * 0.255, d * 0.025]} color={color} radius={0.055} />
    <Block size={[w * 0.93, h * 0.2, d * 0.89]} position={[0, h * 0.445, d * 0.035]} color="#e9e4da" radius={0.075} />
    <Block size={[w * 0.94, h * 0.095, d * 0.63]} position={[0, h * 0.575, d * 0.155]} color={color} radius={0.05} />
    <Block size={[w * 0.93, h * 0.035, d * 0.11]} position={[0, h * 0.631, -d * 0.105]} color="#ded5c6" radius={0.012} />
    {[-1, 1].map((side) => <group key={side}>
      <Block size={[w * 0.395, h * 0.13, d * 0.18]} position={[side * w * 0.225, h * 0.6, -d * 0.285]} color="#f1ebe1" radius={0.07} />
      <Block size={[w * 0.35, h * 0.025, d * 0.14]} position={[side * w * 0.225, h * 0.667, -d * 0.285]} color="#f4eee4" radius={0.012} />
    </group>)}
    <Block size={[w * 0.94, h * 0.035, d * 0.2]} position={[0, h * 0.636, d * 0.325]} color="#a89b85" radius={0.012} />
    {[-1, 1].map((side) => <Block key={side} size={[w * 0.91, h * 0.008, d * 0.008]} position={[0, h * 0.657, d * (0.325 + side * 0.075)]} color="#d6c9b2" radius={0.001} />)}
  </group>;
}

const BOOK_COLORS = ["#7b8b78", "#d8c8aa", "#a8654d", "#e8dfcf", "#53677a"];

function ShelfBooks({ width, height, depth, offset = 0 }: { width: number; height: number; depth: number; offset?: number }) {
  return <group>
    {[0, 1, 2, 3, 4].map((index) => {
      const bookHeight = height * (0.68 + (index % 3) * 0.13);
      return <group key={index} position={[(index - 2) * width * 0.175, 0, 0]}>
        <Block size={[width * 0.145, bookHeight, depth]} position={[0, bookHeight / 2, 0]} color={BOOK_COLORS[(index + offset) % BOOK_COLORS.length]} radius={0.003} />
        <Block size={[width * 0.095, height * 0.012, depth * 0.015]} position={[0, bookHeight * 0.78, depth * 0.502]} color="#e8dec9" radius={0.0005} />
      </group>;
    })}
  </group>;
}

function Bookcase({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return <group>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.4, h * 0.04, z * d * 0.3]} height={h * 0.08} radius={0.023} color="#5c4c3a" />))}
    <Block size={[w * 0.94, h * 0.92, d * 0.08]} position={[0, h * 0.54, -d * 0.46]} color={color} radius={0.006} />
    {[-1, 1].map((side) => <Block key={side} size={[w * 0.055, h * 0.92, d]} position={[side * w * 0.4725, h * 0.54, 0]} color={color} radius={0.009} />)}
    {[0, 1, 2, 3, 4].map((index) => <Block key={index} size={[w * 0.91, h * 0.024, d]} position={[0, h * (0.095 + index * 0.22), 0]} color={color} radius={0.006} />)}
    {[0, 1, 2, 3].map((index) => <group key={index} position={[(index % 2 ? 1 : -1) * w * 0.19, h * (0.108 + index * 0.22), d * 0.035]}>
      <ShelfBooks width={w * 0.4} height={h * 0.17} depth={d * 0.61} offset={index} />
    </group>)}
    {[0, 2].map((index) => <mesh key={index} position={[w * 0.235, h * (0.17 + index * 0.22), d * 0.02]} scale={[w * 0.095, h * 0.061, d * 0.26]} castShadow receiveShadow>
      <sphereGeometry args={[1, 20, 12]} />
      <meshStandardMaterial color={index ? "#a66b50" : "#d9d4c6"} roughness={0.9} />
    </mesh>)}
  </group>;
}

function Sideboard({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return <group>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.42, h * 0.09, z * d * 0.32]} height={h * 0.18} radius={0.026} color="#5b4b3d" />))}
    <Block size={[w, h * 0.8, d]} position={[0, h * 0.6, 0]} color={color} radius={0.02} />
    {[-1, 0, 1].map((door) => <group key={door}>
      <Block size={[w * 0.313, h * 0.67, d * 0.055]} position={[door * w * 0.326, h * 0.59, d * 0.461]} color={color} radius={0.009} />
      {[-1, 0, 1, 2].map((reed) => <Block key={reed} size={[w * 0.008, h * 0.56, d * 0.016]} position={[door * w * 0.326 + (reed - 0.5) * w * 0.065, h * 0.59, d * 0.487]} color="#7c674e" radius={0.002} />)}
      <Block size={[w * 0.055, h * 0.022, d * 0.032]} position={[door * w * 0.326, h * 0.82, d * 0.48]} color="#ccb488" radius={0.004} metalness={0.55} />
    </group>)}
  </group>;
}

function DiningTable({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return <group>
    <Block size={[w, h * 0.095, d]} position={[0, h * 0.9525, 0]} color={color} radius={0.045} roughness={0.6} />
    <Block size={[w * 0.79, h * 0.12, d * 0.73]} position={[0, h * 0.855, 0]} color={color} radius={0.015} />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.36, h * 0.44, z * d * 0.32]} height={h * 0.88} radius={0.043} color={color} />))}
  </group>;
}

function SideTable({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  const radius = Math.min(w, d);
  return <group>
    <mesh position={[0, h * 0.93, 0]} scale={[w, 1, d]} castShadow receiveShadow>
      <cylinderGeometry args={[0.49, 0.5, h * 0.14, 40]} />
      <meshStandardMaterial color={color} roughness={0.64} />
    </mesh>
    <mesh position={[0, h * 0.46, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radius * 0.19, radius * 0.24, h * 0.8, 24]} />
      <meshStandardMaterial color={color} roughness={0.76} />
    </mesh>
    <mesh position={[0, h * 0.045, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radius * 0.3, radius * 0.34, h * 0.09, 32]} />
      <meshStandardMaterial color={color} roughness={0.76} />
    </mesh>
    {Array.from({ length: 12 }, (_, index) => {
      const angle = index / 12 * Math.PI * 2;
      return <Leg key={index} position={[Math.cos(angle) * radius * 0.21, h * 0.46, Math.sin(angle) * radius * 0.21]} height={h * 0.71} radius={0.009} color={color} />;
    })}
  </group>;
}

function DiningChair({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return <group>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.36, h * 0.255, z * d * 0.32]} height={h * 0.51} radius={0.019} color="#9c7853" />))}
    <Block size={[w * 0.96, h * 0.065, d * 0.87]} position={[0, h * 0.515, d * 0.025]} color="#9c7853" radius={0.025} />
    <Block size={[w * 0.9, h * 0.075, d * 0.78]} position={[0, h * 0.575, d * 0.04]} color={color} radius={0.035} />
    {[-1, 1].map((side) => <Leg key={side} position={[side * w * 0.37, h * 0.735, -d * 0.36]} height={h * 0.45} radius={0.02} color="#9c7853" />)}
    {[-1, 0, 1].map((reed) => <Block key={reed} size={[w * 0.075, h * 0.31, d * 0.055]} position={[reed * w * 0.19, h * 0.78, -d * 0.36]} color="#ad8861" radius={0.01} />)}
    <Block size={[w, h * 0.125, d * 0.125]} position={[0, h * 0.9375, -d * 0.36]} color="#9c7853" radius={0.03} />
    <Block size={[w * 0.73, h * 0.12, d * 0.05]} position={[0, h * 0.91, -d * 0.28]} color={color} radius={0.02} />
  </group>;
}

function Ottoman({ dimensions: [w, h, d], color }: Omit<FurnitureProps, "category">) {
  return <group>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Leg key={`${x}:${z}`} position={[x * w * 0.3, h * 0.075, z * d * 0.3]} height={h * 0.15} radius={0.024} color="#5a4538" />))}
    <Block size={[w * 0.88, h * 0.27, d * 0.88]} position={[0, h * 0.265, 0]} color={color} radius={0.055} />
    <Block size={[w, h * 0.64, d]} position={[0, h * 0.68, 0]} color={color} radius={0.115} />
    <Block size={[w * 0.97, h * 0.025, d * 0.97]} position={[0, h * 0.49, 0]} color={color} radius={0.01} />
  </group>;
}

export default function Furniture({ category, sku, dimensions, color }: FurnitureProps) {
  const props = { dimensions, color };
  if (sku === "gather-table") return <DiningTable {...props} />;
  if (sku === "pebble-side-table") return <SideTable {...props} />;
  if (sku === "reed-dining-chair") return <DiningChair {...props} />;
  if (sku === "low-sideboard") return <Sideboard {...props} />;
  switch (category) {
    case "sofa": return <Sofa {...props} />;
    case "table": return <Table {...props} />;
    case "chair": return <Chair {...props} />;
    case "lamp": return <Lamp {...props} />;
    case "plant": return <Plant {...props} />;
    case "rug": return <Rug {...props} />;
    case "desk": return <Desk {...props} />;
    case "bed": return <Bed {...props} />;
    case "storage": return <Bookcase {...props} />;
    case "ottoman": return <Ottoman {...props} />;
  }
}
