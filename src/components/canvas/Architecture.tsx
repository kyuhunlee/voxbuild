"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import { Color } from "three";
import type { Environment } from "@/lib/environments";
import type { Room } from "@/lib/schema";
import { ARTWORK_HEIGHT, ARTWORK_WIDTH, getRoomArtworks, getRoomWindows, type Artwork as ArtworkData, type WindowOpening } from "@/lib/room-decor";

type Vec3 = [number, number, number];
type Lighting = Environment["lighting"];

const WINDOW_PALETTES = {
  day: { sky: "#d2e0df", skyline: ["#b6c5c5", "#bfcfce"], curtain: "#d9d4c5", frame: "#e7e3d9", glass: "#f0f4ee" },
  overcast: { sky: "#d8dde2", skyline: ["#aeb8c3", "#bec7ce"], curtain: "#c8c8c3", frame: "#e2e4e2", glass: "#e3e9ed" },
  morning: { sky: "#e7e3cb", skyline: ["#a3b399", "#bbc5ac"], curtain: "#d4dac5", frame: "#e7e8d9", glass: "#f0eddb" },
  coastal: { sky: "#b8dce8", skyline: ["#8ebcc8", "#a2cbd3"], curtain: "#d6e1df", frame: "#e9eeea", glass: "#d5f0ef" },
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

function Window({ room, opening, lighting, showCelestialDisc }: { room: Room; opening: WindowOpening; lighting: Lighting; showCelestialDisc: boolean }) {
  const { width, height, sill, offset, wall } = opening;
  const position: Vec3 = wall === "back" ? [offset, sill + height / 2, -room.depth / 2] : [-room.width / 2, sill + height / 2, offset];
  const palette = WINDOW_PALETTES[lighting];
  return <group position={position} rotation={[0, wall === "left" ? Math.PI / 2 : 0, 0]}>
    <mesh position={[0, 0, -0.075]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={palette.sky} />
    </mesh>
    {showCelestialDisc && (lighting === "sunset" || lighting === "night" || lighting === "morning") && <mesh position={[width * 0.28, height * 0.25, -0.071]}>
      <circleGeometry args={[height * (lighting === "night" ? 0.065 : 0.105), 32]} />
      <meshBasicMaterial color={lighting === "night" ? "#e4e8da" : "#ffe2a3"} />
    </mesh>}
    {lighting === "coastal" ? <group>
      <mesh position={[0, -height * 0.27, -0.067]}><planeGeometry args={[width, height * 0.46]} /><meshBasicMaterial color="#83b4c0" /></mesh>
      <mesh position={[0, -height * 0.065, -0.065]}><planeGeometry args={[width, height * 0.018]} /><meshBasicMaterial color="#d2e7e3" /></mesh>
    </group> : [0, 1, 2, 3, 4, 5, 6].map((index) => <mesh key={index} position={[(index / 6 - 0.5) * (width - 0.3), -height / 2 + height * (0.12 + (index % 3) * 0.045), -0.065]}>
      {lighting === "morning" ? <circleGeometry args={[height * (0.13 + (index % 3) * 0.025), 20]} /> : <planeGeometry args={[width * (0.075 + (index % 2) * 0.045), height * (0.23 + (index % 3) * 0.09)]} />}
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
    {[-1, 1].map((side) => <group key={side} position={[side * (width / 2 + 0.06), 0.03, 0.13]}>
      {[0, 1, 2].map((fold) => <mesh key={fold} position={[(fold - 1) * 0.025, 0, Math.sin(fold * 2) * 0.02]} castShadow>
        <cylinderGeometry args={[0.028, 0.03, height + 0.12, 8, 1, true]} />
        <meshStandardMaterial color={palette.curtain} roughness={1} side={2} />
      </mesh>)}
    </group>)}
  </group>;
}

function ArtRect({ size, position, color, angle = 0 }: { size: [number, number]; position: Vec3; color: string; angle?: number }) {
  return <mesh position={position} rotation={[0, 0, angle]}>
    <planeGeometry args={size} />
    <meshStandardMaterial color={color} roughness={1} />
  </mesh>;
}

function ArtDisc({ position, radius, color, scale = [1, 1, 1], angle = 0 }: { position: Vec3; radius: number; color: string; scale?: Vec3; angle?: number }) {
  return <mesh position={position} scale={scale} rotation={[0, 0, angle]}>
    <circleGeometry args={[radius, 40]} />
    <meshStandardMaterial color={color} roughness={1} />
  </mesh>;
}

function PaintedDesign({ design }: { design: ArtworkData["design"] }) {
  switch (design) {
    case "botanical": return <group>
      <ArtRect size={[0.7, 0.9]} position={[0, 0, 0.027]} color="#e2e4cd" />
      <ArtRect size={[0.018, 0.72]} position={[0, -0.025, 0.029]} color="#617252" angle={-0.08} />
      {[0, 1, 2, 3, 4, 5].map((leaf) => <ArtDisc key={leaf} position={[(leaf % 2 ? 1 : -1) * 0.09, -0.24 + leaf * 0.105, 0.031]} radius={0.105} scale={[1.2, 0.48, 1]} angle={leaf % 2 ? 0.6 : -0.6} color={leaf % 3 ? "#6e8560" : "#8d9c72"} />)}
    </group>;
    case "coastal": return <group>
      <ArtRect size={[0.7, 0.9]} position={[0, 0, 0.027]} color="#c8dce0" />
      <ArtDisc position={[-0.19, 0.27, 0.029]} radius={0.075} color="#f2ddad" />
      <ArtRect size={[0.7, 0.35]} position={[0, -0.075, 0.03]} color="#6596a6" />
      <ArtRect size={[0.7, 0.07]} position={[0, -0.22, 0.032]} color="#a3c1bc" />
      <ArtRect size={[0.7, 0.19]} position={[0, -0.355, 0.034]} color="#d4bd94" />
      <ArtRect size={[0.23, 0.015]} position={[0.13, -0.08, 0.035]} color="#4b6875" />
      <mesh position={[0.12, 0.045, 0.035]} rotation={[0, 0, -Math.PI / 6]}><circleGeometry args={[0.13, 3]} /><meshStandardMaterial color="#f2eee0" roughness={1} /></mesh>
    </group>;
    case "geometric": return <group>
      <ArtRect size={[0.7, 0.9]} position={[0, 0, 0.027]} color="#e6dfcf" />
      <ArtRect size={[0.24, 0.58]} position={[-0.18, 0.025, 0.029]} color="#536979" />
      <ArtRect size={[0.25, 0.28]} position={[0.135, -0.2, 0.031]} color="#b66c4d" />
      <ArtDisc position={[0.135, 0.2, 0.033]} radius={0.145} color="#b9a37b" />
      <ArtRect size={[0.48, 0.018]} position={[0, -0.365, 0.035]} color="#4c554f" />
    </group>;
    case "sunset": return <group>
      <ArtRect size={[0.7, 0.9]} position={[0, 0, 0.027]} color="#e9c59d" />
      <ArtDisc position={[0.04, 0.16, 0.029]} radius={0.205} color="#d38b55" />
      <ArtRect size={[0.7, 0.3]} position={[0, -0.12, 0.031]} color="#ba795c" />
      <ArtRect size={[0.7, 0.19]} position={[0, -0.29, 0.033]} color="#8d5c54" />
      <ArtRect size={[0.7, 0.09]} position={[0, -0.405, 0.035]} color="#655e58" />
    </group>;
    default: return <group>
      <ArtDisc position={[-0.11, 0.13, 0.027]} radius={0.21} color="#b87556" />
      <ArtRect size={[0.24, 0.5]} position={[0.11, -0.12, 0.029]} color="#667363" />
      <ArtRect size={[0.26, 0.12]} position={[-0.15, -0.24, 0.031]} color="#c3ac85" angle={-0.12} />
    </group>;
  }
}

function Artwork({ room, artwork, selected, onSelect, onHover }: { room: Room; artwork: ArtworkData; selected: boolean; onSelect: (id: string | null) => void; onHover: (hovered: boolean) => void }) {
  const position: Vec3 = artwork.wall === "left" ? [-room.width / 2 + 0.03, artwork.height, artwork.offset] : [artwork.offset, artwork.height, -room.depth / 2 + 0.03];
  const halfWidth = ARTWORK_WIDTH / 2 + 0.025;
  const halfHeight = ARTWORK_HEIGHT / 2 + 0.025;
  const border: Vec3[] = [[-halfWidth, -halfHeight, 0.048], [halfWidth, -halfHeight, 0.048], [halfWidth, halfHeight, 0.048], [-halfWidth, halfHeight, 0.048], [-halfWidth, -halfHeight, 0.048]];
  return <group position={position} rotation={[0, artwork.wall === "left" ? Math.PI / 2 : 0, 0]}
    onClick={(event) => { event.stopPropagation(); onSelect(artwork.id); }}
    onPointerOver={(event) => { event.stopPropagation(); onHover(true); }}
    onPointerOut={() => onHover(false)}
  >
    <WallBox size={[ARTWORK_WIDTH, ARTWORK_HEIGHT, 0.045]} position={[0, 0, 0]} color={artwork.design === "geometric" ? "#3e4343" : "#6b4e3a"} />
    <ArtRect size={[ARTWORK_WIDTH - 0.065, ARTWORK_HEIGHT - 0.065]} position={[0, 0, 0.024]} color="#e8e0d0" />
    <PaintedDesign design={artwork.design} />
    {selected && <Line points={border} color="#e2a16b" lineWidth={2} />}
  </group>;
}

function WallWithOpenings({ room, wall, openings }: { room: Room; wall: WindowOpening["wall"]; openings: WindowOpening[] }) {
  const span = wall === "back" ? room.width : room.depth;
  const wallOpenings = openings.filter((opening) => opening.wall === wall).map((opening) => ({ ...opening, offset: wall === "left" ? -opening.offset : opening.offset }));
  const xEdges = [...new Set([-span / 2, span / 2, ...wallOpenings.flatMap((opening) => [opening.offset - opening.width / 2, opening.offset + opening.width / 2])])].sort((a, b) => a - b);
  const yEdges = [...new Set([0, room.height, ...wallOpenings.flatMap((opening) => [opening.sill, opening.sill + opening.height])])].sort((a, b) => a - b);
  const position: Vec3 = wall === "back" ? [0, 0, -room.depth / 2 - 0.065] : [-room.width / 2 - 0.065, 0, 0];
  return <group position={position} rotation={[0, wall === "left" ? Math.PI / 2 : 0, 0]}>
    {xEdges.slice(0, -1).flatMap((left, x) => yEdges.slice(0, -1).map((bottom, y) => {
      const width = xEdges[x + 1] - left;
      const height = yEdges[y + 1] - bottom;
      const centerX = left + width / 2;
      const centerY = bottom + height / 2;
      const insideOpening = wallOpenings.some((opening) => Math.abs(centerX - opening.offset) < opening.width / 2 && centerY > opening.sill && centerY < opening.sill + opening.height);
      return insideOpening ? null : <WallBox key={`${x}:${y}`} size={[width, height, 0.13]} position={[centerX, centerY, 0]} color={room.wallColor} />;
    }))}
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

export default function Architecture({ room, lighting = "day", selectedArtworkId, onSelectArtwork, onHover }: { room: Room; lighting?: Lighting; selectedArtworkId: string | null; onSelectArtwork: (id: string | null) => void; onHover: (hovered: boolean) => void }) {
  const { width: w, depth: d, height: h } = room;
  const windows = getRoomWindows(room);
  const artworks = getRoomArtworks(room);
  return <group>
    <Floor room={room} />
    <WallWithOpenings room={room} wall="back" openings={windows} />
    <WallWithOpenings room={room} wall="left" openings={windows} />
    <WallBox size={[0.13, h, 0.13]} position={[-w / 2 - 0.065, h / 2, -d / 2 - 0.065]} color={room.wallColor} />
    <WallBox size={[0.035, 0.09, d]} position={[-w / 2 + 0.018, 0.045, 0]} color="#ddd7c9" />
    <WallBox size={[w, 0.09, 0.035]} position={[0, 0.045, -d / 2 + 0.018]} color="#ddd7c9" />
    <WallBox size={[0.15, 0.045, d + 0.15]} position={[-w / 2 - 0.065, h + 0.02, -0.065]} color="#e0d9cc" />
    <WallBox size={[w + 0.13, 0.045, 0.15]} position={[-0.065, h + 0.02, -d / 2 - 0.065]} color="#e0d9cc" />
    {windows.map((opening, index) => <Window key={`${opening.wall}:${index}`} room={room} opening={opening} lighting={lighting} showCelestialDisc={index === 0} />)}
    {artworks.map((artwork) => <Artwork key={artwork.id} room={room} artwork={artwork} selected={selectedArtworkId === artwork.id} onSelect={onSelectArtwork} onHover={onHover} />)}
  </group>;
}
