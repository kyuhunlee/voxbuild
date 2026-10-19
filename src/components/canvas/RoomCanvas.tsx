"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Line, OrbitControls } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { ACESFilmicToneMapping, Group, MathUtils, Vector3 } from "three";
import { getCatalogItem } from "@/lib/catalog-data";
import { getEnvironmentForRoom, type Environment } from "@/lib/environments";
import type { Scene, SceneObject } from "@/lib/schema";
import Architecture, { Dimensions } from "./Architecture";
import Furniture from "./Furniture";

export interface RoomCanvasProps {
  scene: Scene;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  view: "perspective" | "top";
  showDimensions: boolean;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

function CameraRig({ view, width, depth, reducedMotion }: { view: RoomCanvasProps["view"]; width: number; depth: number; reducedMotion: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size } = useThree();
  const moving = useRef(true);
  const target = useRef(new Vector3(0, 0.5, 0));
  const destination = useRef(new Vector3(6.4, 5.75, 8.05));

  useEffect(() => {
    const scale = Math.max(width / 6, depth / 5.2);
    const narrow = Math.max(1, 1.25 / (size.width / Math.max(size.height, 1)));
    destination.current.set(...(view === "top" ? [0, 12.6 * scale * narrow, 0.001] as const : [6.4 * scale * narrow, 5.75 * scale * narrow, 8.05 * scale * narrow] as const));
    target.current.set(0, view === "top" ? 0 : 0.6, 0);
    moving.current = true;
    if (reducedMotion) {
      camera.position.copy(destination.current);
      controls.current?.target.copy(target.current);
      controls.current?.update();
      moving.current = false;
    }
  }, [view, width, depth, camera, reducedMotion, size.width, size.height]);

  useFrame((_, delta) => {
    if (!moving.current || !controls.current) return;
    const amount = 1 - Math.exp(-5 * Math.min(delta, 0.1));
    camera.position.lerp(destination.current, amount);
    controls.current.target.lerp(target.current, amount);
    controls.current.update();
    if (camera.position.distanceTo(destination.current) < 0.008) moving.current = false;
  });

  return <OrbitControls
    ref={controls}
    makeDefault
    enableDamping
    dampingFactor={0.085}
    enablePan
    minDistance={4}
    maxDistance={Math.max(width, depth) * 4}
    minPolarAngle={0.001}
    maxPolarAngle={Math.PI / 2.02}
    enableRotate={view !== "top"}
    target={[0, 0.6, 0]}
    onStart={() => { moving.current = false; }}
  />;
}

function SceneFurniture({ object, selected, onSelect, onHover, reducedMotion }: {
  object: SceneObject;
  selected: boolean;
  onSelect: RoomCanvasProps["onSelect"];
  onHover: (hovered: boolean) => void;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const initialPosition = useRef(object.position);
  const initialRotation = useRef<[number, number, number]>([0, object.rotation, 0]);
  const catalogItem = getCatalogItem(object.sku);
  const target = useMemo(() => new Vector3(...object.position), [object.position]);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (reducedMotion) {
      group.current.position.copy(target);
      group.current.rotation.y = object.rotation;
      return;
    }
    const amount = 1 - Math.exp(-10 * Math.min(delta, 0.1));
    group.current.position.lerp(target, amount);
    const angle = MathUtils.euclideanModulo(object.rotation - group.current.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    group.current.rotation.y += angle * amount;
  });

  if (!catalogItem) return null;
  const [w, , d] = catalogItem.dimensions;
  const selection: [number, number, number][] = [[-w / 2 - 0.08, 0.036, -d / 2 - 0.08], [w / 2 + 0.08, 0.036, -d / 2 - 0.08], [w / 2 + 0.08, 0.036, d / 2 + 0.08], [-w / 2 - 0.08, 0.036, d / 2 + 0.08], [-w / 2 - 0.08, 0.036, -d / 2 - 0.08]];

  return <group
    ref={group}
    position={initialPosition.current}
    rotation={initialRotation.current}
    onClick={(event) => { event.stopPropagation(); onSelect(object.id); }}
    onPointerOver={(event) => { event.stopPropagation(); onHover(true); }}
    onPointerOut={() => onHover(false)}
  >
    <Furniture category={catalogItem.category} sku={catalogItem.sku} dimensions={catalogItem.dimensions} color={object.color} />
    {selected && <Line points={selection} color="#b0643e" lineWidth={1.8} transparent opacity={0.9} />}
  </group>;
}

const LIGHTING: Record<Environment["lighting"], {
  background: string; ground: string; ambient: string; ambientIntensity: number;
  sky: string; bounce: string; hemisphereIntensity: number; sun: string; sunIntensity: number;
  sunPosition: [number, number, number]; fill: string; fillIntensity: number;
}> = {
  day: { background: "#e2e0d9", ground: "#d5d4cd", ambient: "#e5e6dd", ambientIntensity: 0.55, sky: "#e5eeef", bounce: "#8d7354", hemisphereIntensity: 1.1, sun: "#ffe6bd", sunIntensity: 3.1, sunPosition: [-3, 8, 5], fill: "#c7d9e4", fillIntensity: 1.2 },
  sunset: { background: "#cfb7ae", ground: "#bda69a", ambient: "#e8c9b9", ambientIntensity: 0.65, sky: "#efd3cc", bounce: "#8c6250", hemisphereIntensity: 0.95, sun: "#ffbb80", sunIntensity: 3.3, sunPosition: [-6, 4, 3], fill: "#c5bfdc", fillIntensity: 0.9 },
  night: { background: "#303b4e", ground: "#293547", ambient: "#c2cce3", ambientIntensity: 0.6, sky: "#a5bbdd", bounce: "#72695f", hemisphereIntensity: 0.8, sun: "#c0d8ff", sunIntensity: 1.3, sunPosition: [-3, 8, -2], fill: "#f4d4a8", fillIntensity: 1.5 },
};

function RoomCanvas({ scene, selectedId, onSelect, view, showDimensions }: RoomCanvasProps) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const shadowSize = Math.max(scene.room.width, scene.room.depth) + 1;
  const environment = getEnvironmentForRoom(scene.room);
  const light = LIGHTING[environment.lighting];

  return <div style={{ width: "100%", height: "100%", cursor: hovered ? "pointer" : "grab" }} aria-label="Interactive 3D room. Drag to orbit, scroll to zoom, and click furniture to select it.">
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [6.4, 5.75, 8.05], fov: 38, near: 0.1, far: 150 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 1.08; }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={[light.background]} />
      <fog attach="fog" args={[light.background, 28, 65]} />
      <ambientLight intensity={light.ambientIntensity} color={light.ambient} />
      <hemisphereLight color={light.sky} groundColor={light.bounce} intensity={light.hemisphereIntensity} />
      <directionalLight
        position={light.sunPosition}
        color={light.sun}
        intensity={light.sunIntensity}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[5, 5, 2]} color={light.fill} intensity={light.fillIntensity} />
      {environment.lighting === "night" && <pointLight position={[0, scene.room.height * 0.82, 0]} color="#ffdaab" intensity={3} distance={Math.max(scene.room.width, scene.room.depth) * 1.4} decay={2} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={light.ground} roughness={1} />
      </mesh>
      <Architecture room={scene.room} lighting={environment.lighting} />
      {scene.objects.map((object) => <SceneFurniture key={`${scene.id}:${object.id}`} object={object} selected={selectedId === object.id} onSelect={onSelect} onHover={setHovered} reducedMotion={reducedMotion} />)}
      <ContactShadows position={[0, 0.006, 0]} opacity={0.24} scale={shadowSize * 2} blur={2.4} far={3} resolution={256} color="#4c3927" />
      {showDimensions && <Dimensions room={scene.room} lighting={environment.lighting} />}
      <CameraRig view={view} width={scene.room.width} depth={scene.room.depth} reducedMotion={reducedMotion} />
    </Canvas>
  </div>;
}

export default memo(RoomCanvas);
