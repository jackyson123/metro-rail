'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { STATIONS } from '@/lib/mtr/engine'
import type { StateRef } from './instancing'

const BUILDINGS = [
  { x: -18, y: 7, z: 0, w: 8, d: 16, color: '#a9b6c2' },
  { x: -28, y: 11, z: -35, w: 10, d: 20, color: '#d2b48c' },
  { x: 17, y: 9, z: -68, w: 11, d: 18, color: '#82909d' },
  { x: 28, y: 15, z: -102, w: 12, d: 22, color: '#b9c4ce' },
  { x: -22, y: 8, z: -138, w: 14, d: 18, color: '#c5a98c' },
  { x: 22, y: 13, z: -174, w: 10, d: 18, color: '#8a9aaa' },
  { x: -30, y: 17, z: -214, w: 12, d: 24, color: '#b5b0a5' },
  { x: 28, y: 10, z: -250, w: 14, d: 20, color: '#a7bbc9' },
  { x: -19, y: 12, z: -292, w: 13, d: 19, color: '#c6a58e' },
  { x: 20, y: 18, z: -330, w: 15, d: 23, color: '#98aeb8' },
  { x: -29, y: 9, z: -370, w: 11, d: 17, color: '#b9b1a2' },
  { x: 27, y: 14, z: -410, w: 12, d: 21, color: '#7f9aa5' },
  { x: -20, y: 16, z: -452, w: 14, d: 20, color: '#c9b18e' },
  { x: 24, y: 11, z: -495, w: 10, d: 18, color: '#aebdca' },
]

export function OutdoorScenery({ stateRef }: { stateRef: StateRef }) {
  const groupRef = useRef<THREE.Group>(null)
  const mats = useMemo(() => BUILDINGS.map((b) => new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.8 })), [])
  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3d37a', emissive: '#f3b942', emissiveIntensity: 0.8 }), [])
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6d9eaf', metalness: 0.25, roughness: 0.2, transparent: true, opacity: 0.75 }), [])
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#56685a', roughness: 1 }), [])
  const roadMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#30343a', roughness: 0.95 }), [])
  const laneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e5d7a3', roughness: 0.8 }), [])
  const treeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f604c', roughness: 1 }), [])
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#71503a', roughness: 1 }), [])
  const skyMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9bb8c9', side: THREE.BackSide, fog: false }), [])

  useFrame(() => {
    const s = stateRef.current
    if (!s) return
    // Keep the city visible between stations; only hide it in the dedicated tunnel stretches.
    const nearStation = STATIONS.some((station) => Math.abs(s.pos - station.pos) < 52)
    const tunnelStretch = Math.floor(Math.max(0, s.pos) / 250) % 3 === 1
    const outdoor = !tunnelStretch && !nearStation
    const group = groupRef.current
    if (!group) return
    group.visible = outdoor
    group.position.z = -s.pos
    group.rotation.y = Math.sin(s.pos * 0.0017) * 0.035
  })

  return (
    <group ref={groupRef}>
      <mesh position={[0, 30, -220]} scale={[180, 70, 500]}>
        <sphereGeometry args={[1, 24, 12]} />
        <primitive object={skyMat} attach="material" />
      </mesh>
      <mesh position={[0, -0.25, -180]} scale={[90, 0.12, 600]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={roadMat} attach="material" />
      </mesh>
      <mesh position={[0, -0.1, -180]} scale={[0.12, 0.03, 600]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={laneMat} attach="material" />
      </mesh>
      <mesh position={[0, -0.35, -130]} scale={[90, 0.2, 600]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={groundMat} attach="material" />
      </mesh>
      {Array.from({ length: 13 }).map((_, i) => {
        const z = -22 - i * 38
        const x = i % 2 === 0 ? -11 : 12
        return (
          <group key={`tree-${i}`} position={[x, 0, z]}>
            <mesh position={[0, 1.2, 0]} scale={[0.22, 2.4, 0.22]}>
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <primitive object={trunkMat} attach="material" />
            </mesh>
            <mesh position={[0, 3.1, 0]} scale={[1.5, 2.5, 1.5]}>
              <coneGeometry args={[1, 1, 8]} />
              <primitive object={treeMat} attach="material" />
            </mesh>
          </group>
        )
      })}
      {BUILDINGS.map((b, i) => (
        <group key={i} position={[b.x, b.y / 2, b.z]}>
          <mesh scale={[b.w, b.y, b.d]}>
            <boxGeometry args={[1, 1, 1]} />
            <primitive object={mats[i]} attach="material" />
          </mesh>
          {Array.from({ length: 4 }).map((_, row) => (
            <mesh key={row} position={[b.x > 0 ? -b.w / 2 - 0.02 : b.w / 2 + 0.02, b.y * 0.25 + row * 1.45, 0]} scale={[0.04, 0.55, b.d * 0.72]}>
              <boxGeometry args={[1, 1, 1]} />
              <primitive object={windowMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 5.2, -165]} scale={[44, 8.5, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
    </group>
  )
}
