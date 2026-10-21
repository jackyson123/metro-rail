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
]

export function OutdoorScenery({ stateRef }: { stateRef: StateRef }) {
  const groupRef = useRef<THREE.Group>(null)
  const mats = useMemo(() => BUILDINGS.map((b) => new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.8 })), [])
  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3d37a', emissive: '#f3b942', emissiveIntensity: 0.8 }), [])
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6d9eaf', metalness: 0.25, roughness: 0.2, transparent: true, opacity: 0.75 }), [])
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#56685a', roughness: 1 }), [])

  useFrame(() => {
    const s = stateRef.current
    if (!s) return
    const outdoor = ![1, 3, 5].some((n) => Math.abs(s.pos - STATIONS[n].pos) < 160)
    const group = groupRef.current
    if (!group) return
    group.visible = outdoor
    group.position.z = -s.pos
    group.rotation.y = Math.sin(s.pos * 0.0017) * 0.035
  })

  return (
    <group ref={groupRef}>
      <mesh position={[0, -0.35, -130]} scale={[90, 0.2, 600]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={groundMat} attach="material" />
      </mesh>
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
