"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Line, OrbitControls } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { ACESFilmicToneMapping, Group, MathUtils, Vector3 } from "three";
import { getCatalogItem } from "@/lib/catalog-data";
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
  const destination = useRef(new Vector3(8, 7, 10));

  useEffect(() => {
    const scale = Math.max(width / 6, depth / 5.2);
    const narrow = Math.max(1, 1.25 / (size.width / Math.max(size.height, 1)));
    destination.current.set(...(view === "top" ? [0, 12.6 * scale * narrow, 0.001] as const : [7.8 * scale * narrow, 6.9 * scale * narrow, 9.8 * scale * narrow] as const));
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
    <Furniture category={catalogItem.category} dimensions={catalogItem.dimensions} color={object.color} />
    {selected && <Line points={selection} color="#b0643e" lineWidth={1.8} transparent opacity={0.9} />}
  </group>;
}

function RoomCanvas({ scene, selectedId, onSelect, view, showDimensions }: RoomCanvasProps) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const shadowSize = Math.max(scene.room.width, scene.room.depth) + 1;

  return <div style={{ width: "100%", height: "100%", cursor: hovered ? "pointer" : "grab" }} aria-label="Interactive 3D room. Drag to orbit, scroll to zoom, and click furniture to select it.">
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [7.8, 6.9, 9.8], fov: 38, near: 0.1, far: 150 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 1.08; }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#e2e0d9"]} />
      <fog attach="fog" args={["#e2e0d9", 28, 65]} />
      <ambientLight intensity={0.55} color="#e5e6dd" />
      <hemisphereLight color="#e5eeef" groundColor="#8d7354" intensity={1.1} />
      <directionalLight
        position={[-3, 8, 5]}
        color="#ffe6bd"
        intensity={3.1}
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
      <directionalLight position={[5, 5, -2]} color="#c7d9e4" intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#d5d4cd" roughness={1} />
      </mesh>
      <Architecture room={scene.room} />
      {scene.objects.map((object) => <SceneFurniture key={`${scene.id}:${object.id}`} object={object} selected={selectedId === object.id} onSelect={onSelect} onHover={setHovered} reducedMotion={reducedMotion} />)}
      <ContactShadows position={[0, 0.006, 0]} opacity={0.24} scale={shadowSize * 2} blur={2.4} far={3} resolution={256} color="#4c3927" />
      {showDimensions && <Dimensions room={scene.room} />}
      <CameraRig view={view} width={scene.room.width} depth={scene.room.depth} reducedMotion={reducedMotion} />
    </Canvas>
  </div>;
}

export default memo(RoomCanvas);
