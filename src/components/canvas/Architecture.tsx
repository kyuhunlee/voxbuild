"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import { Color } from "three";
import type { Environment } from "@/lib/environments";

type Room = { width: number; depth: number; height: number; wallColor: string; floorColor: string };
type Vec3 = [number, number, number];
type Lighting = Environment["lighting"];

const WINDOW_PALETTES = {
  day: { sky: "#d2e0df", skyline: ["#b6c5c5", "#bfcfce"], curtain: "#d9d4c5", frame: "#e7e3d9", glass: "#f0f4ee" },
  sunset: { sky: "#e4b59b", skyline: ["#ac9394", "#bca3a0"], curtain: "#d6bca7", frame: "#e7dacb", glass: "#ffe1c2" },
  night: { sky: "#1b2b48", skyline: ["#253751", "#304561"], curtain: "#8993a5", frame: "#a1aab8", glass: "#aebfdb" },
} as const;

function WallBox({ size, position, color }: { size: Vec3; position: Vec3; color: string }) {
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.94} />
  </mesh>;
}

function Floor({ room }: { room: Room }) {
  const planks = useMemo(() => {
    const result: { position: Vec3; size: Vec3; color: string }[] = [];
    const count = Math.ceil(room.width / 0.25);
    const plankWidth = room.width / count;
    for (let x = 0; x < count; x++) {
      const lengths = [0, ...Array.from({ length: Math.ceil(room.depth / 1.7) + 1 }, (_, i) => i * 1.7 + (x % 3) * 0.55).filter((z) => z > 0 && z < room.depth), room.depth];
      for (let z = 0; z < lengths.length - 1; z++) {
        const length = lengths[z + 1] - lengths[z];
        const variation = Math.sin(x * 12.9898 + z * 78.233) * 0.032;
        result.push({
          position: [-room.width / 2 + (x + 0.5) * plankWidth, -0.007, -room.depth / 2 + lengths[z] + length / 2],
          size: [plankWidth - 0.004, 0.014, length - 0.004],
          color: new Color(room.floorColor).offsetHSL(variation * 0.2, variation * 0.5, variation).getStyle(),
        });
      }
    }
    return result;
  }, [room.width, room.depth, room.floorColor]);
  return <group>
    <WallBox size={[room.width + 0.16, 0.16, room.depth + 0.16]} position={[0, -0.095, 0]} color="#655448" />
    {planks.map((plank, index) => <mesh key={index} position={plank.position} receiveShadow>
      <boxGeometry args={plank.size} />
      <meshStandardMaterial color={plank.color} roughness={0.78} />
    </mesh>)}
  </group>;
}

function Window({ room, width, center, sill, top, lighting }: { room: Room; width: number; center: number; sill: number; top: number; lighting: Lighting }) {
  const height = top - sill;
  const z = -room.depth / 2;
  const palette = WINDOW_PALETTES[lighting];
  return <group position={[center, sill + height / 2, z]}>
    <mesh position={[0, 0, -0.075]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={palette.sky} />
    </mesh>
    {lighting !== "day" && <mesh position={[width * 0.28, height * 0.25, -0.071]}>
      <circleGeometry args={[height * (lighting === "night" ? 0.065 : 0.105), 32]} />
      <meshBasicMaterial color={lighting === "night" ? "#e4e8da" : "#ffe2a3"} />
    </mesh>}
    {[0, 1, 2, 3, 4, 5, 6].map((index) => <mesh key={index} position={[(index / 6 - 0.5) * (width - 0.3), -height / 2 + 0.18 + (index % 3) * 0.09, -0.065]}>
      <planeGeometry args={[0.18 + (index % 2) * 0.11, 0.35 + (index % 3) * 0.17]} />
      <meshBasicMaterial color={palette.skyline[index % 2]} />
    </mesh>)}
    {lighting === "night" && [0, 1, 2, 3, 4, 5, 6].flatMap((building) => [0, 1].map((row) => <mesh key={`${building}:${row}`} position={[(building / 6 - 0.5) * (width - 0.3), -height / 2 + 0.12 + row * 0.14, -0.058]}>
      <planeGeometry args={[0.033, 0.047]} />
      <meshBasicMaterial color={building % 3 ? "#f5c98d" : "#a8c4da"} />
    </mesh>))}
    <mesh position={[0, 0, -0.04]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color={palette.glass} transparent opacity={0.1} roughness={0.1} metalness={0.3} />
    </mesh>
    {[-1, 1].map((side) => <group key={side}>
      <WallBox size={[0.065, height + 0.11, 0.12]} position={[side * width / 2, 0, 0]} color={palette.frame} />
      <WallBox size={[width + 0.08, 0.065, 0.12]} position={[0, side * height / 2, 0]} color={palette.frame} />
    </group>)}
    <WallBox size={[0.044, height, 0.065]} position={[0, 0, 0.03]} color="#a0a69e" />
    <WallBox size={[width, 0.038, 0.065]} position={[0, -height * 0.12, 0.03]} color="#a0a69e" />
    <WallBox size={[width + 0.22, 0.075, 0.3]} position={[0, -height / 2 - 0.06, 0.035]} color="#e5dfd2" />
    {[-1, 1].map((side) => <group key={side} position={[side * (width / 2 + 0.15), 0.06, 0.13]}>
      {[0, 1, 2].map((fold) => <mesh key={fold} position={[(fold - 1) * 0.065, 0, Math.sin(fold * 2) * 0.028]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, height + 0.17, 8, 1, true]} />
        <meshStandardMaterial color={palette.curtain} roughness={1} side={2} />
      </mesh>)}
    </group>)}
  </group>;
}

function Artwork({ position }: { position: Vec3 }) {
  return <group position={position} rotation={[0, Math.PI / 2, 0]}>
    <WallBox size={[0.91, 1.14, 0.045]} position={[0, 0, 0]} color="#6b4e3a" />
    <mesh position={[0, 0, 0.025]}>
      <planeGeometry args={[0.85, 1.08]} />
      <meshStandardMaterial color="#ded5c3" roughness={1} />
    </mesh>
    <mesh position={[-0.12, 0.13, 0.027]}>
      <circleGeometry args={[0.235, 40]} />
      <meshStandardMaterial color="#b87556" roughness={1} />
    </mesh>
    <mesh position={[0.11, -0.12, 0.029]}>
      <planeGeometry args={[0.25, 0.54]} />
      <meshStandardMaterial color="#667363" roughness={1} />
    </mesh>
    <mesh position={[-0.16, -0.24, 0.031]} rotation={[0, 0, -0.12]}>
      <planeGeometry args={[0.27, 0.13]} />
      <meshStandardMaterial color="#c3ac85" roughness={1} />
    </mesh>
  </group>;
}

export function Dimensions({ room, lighting = "day" }: { room: Room; lighting?: Lighting }) {
  const { width: w, depth: d } = room;
  const lineColor = lighting === "night" ? "#adbad1" : "#717973";
  const style = { background: "#1b2223", color: "#d6ded8", border: "1px solid #444e49", borderRadius: "5px", padding: "4px 7px", fontFamily: "inherit", fontSize: "10px", whiteSpace: "nowrap" as const, letterSpacing: "0.03em", pointerEvents: "none" as const };
  return <group>
    <Line points={[[-w / 2, 0.025, d / 2 + 0.42], [w / 2, 0.025, d / 2 + 0.42]]} color={lineColor} lineWidth={1} />
    <Line points={[[w / 2 + 0.42, 0.025, -d / 2], [w / 2 + 0.42, 0.025, d / 2]]} color={lineColor} lineWidth={1} />
    {[-1, 1].map((side) => <group key={side}>
      <Line points={[[side * w / 2, 0.025, d / 2 + 0.32], [side * w / 2, 0.025, d / 2 + 0.52]]} color={lineColor} lineWidth={1} />
      <Line points={[[w / 2 + 0.32, 0.025, side * d / 2], [w / 2 + 0.52, 0.025, side * d / 2]]} color={lineColor} lineWidth={1} />
    </group>)}
    <Html center position={[0, 0.03, d / 2 + 0.42]} zIndexRange={[3, 0]}><span style={style}>{w.toFixed(1)} m</span></Html>
    <Html center position={[w / 2 + 0.42, 0.03, 0]} zIndexRange={[3, 0]}><span style={style}>{d.toFixed(1)} m</span></Html>
  </group>;
}

export default function Architecture({ room, lighting = "day" }: { room: Room; lighting?: Lighting }) {
  const { width: w, depth: d, height: h } = room;
  const windowWidth = Math.min(w * 0.43, 2.6);
  const windowCenter = w * 0.12;
  const sill = h * 0.29;
  const windowTop = h * 0.88;
  const leftEnd = windowCenter - windowWidth / 2;
  const rightStart = windowCenter + windowWidth / 2;
  return <group>
    <Floor room={room} />
    <WallBox size={[0.13, h, d + 0.13]} position={[-w / 2 - 0.065, h / 2, -0.065]} color={room.wallColor} />
    <WallBox size={[w, sill, 0.13]} position={[0, sill / 2, -d / 2 - 0.065]} color={room.wallColor} />
    <WallBox size={[w, h - windowTop, 0.13]} position={[0, (h + windowTop) / 2, -d / 2 - 0.065]} color={room.wallColor} />
    <WallBox size={[leftEnd + w / 2, windowTop - sill, 0.13]} position={[(-w / 2 + leftEnd) / 2, (sill + windowTop) / 2, -d / 2 - 0.065]} color={room.wallColor} />
    <WallBox size={[w / 2 - rightStart, windowTop - sill, 0.13]} position={[(w / 2 + rightStart) / 2, (sill + windowTop) / 2, -d / 2 - 0.065]} color={room.wallColor} />
    <WallBox size={[0.035, 0.09, d]} position={[-w / 2 + 0.018, 0.045, 0]} color="#ddd7c9" />
    <WallBox size={[w, 0.09, 0.035]} position={[0, 0.045, -d / 2 + 0.018]} color="#ddd7c9" />
    <WallBox size={[0.15, 0.045, d + 0.15]} position={[-w / 2 - 0.065, h + 0.02, -0.065]} color="#e0d9cc" />
    <WallBox size={[w + 0.13, 0.045, 0.15]} position={[-0.065, h + 0.02, -d / 2 - 0.065]} color="#e0d9cc" />
    <Window room={room} width={windowWidth} center={windowCenter} sill={sill} top={windowTop} lighting={lighting} />
    <Artwork position={[-w / 2 + 0.03, h * 0.61, -d * 0.04]} />
  </group>;
}
