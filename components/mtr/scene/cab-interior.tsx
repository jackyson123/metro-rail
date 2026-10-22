'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BODY_Y } from '@/lib/mtr/layout'
import { getRollingStock, type RollingStock } from '@/lib/mtr/rolling-stock'
import type { StateRef } from './instancing'

const boxGeo = new THREE.BoxGeometry(1, 1, 1)
const planeGeo = new THREE.PlaneGeometry(1, 1)
const DASH_TOP = BODY_Y + 1.02

export function CabInterior({ stateRef, visible, rollingStockId }: { stateRef: StateRef; visible: boolean; rollingStockId: RollingStock['id'] }) {
  const stock = getRollingStock(rollingStockId)
  const group = useRef<THREE.Group>(null)
  const lever = useRef<THREE.Group>(null)
  const atpLamp = useRef<THREE.MeshStandardMaterial>(null)
  const doorLamp = useRef<THREE.MeshStandardMaterial>(null)

  const m = useMemo(
    () => ({
      shell: new THREE.MeshStandardMaterial({ color: '#141619', roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide }),
      dash: new THREE.MeshStandardMaterial({ color: '#1b1d20', roughness: 0.65, metalness: 0.15 }),
      panel: new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.5, metalness: 0.3 }),
      trim: new THREE.MeshStandardMaterial({ color: stock.accent, roughness: 0.45, metalness: 0.6 }),
      screen: new THREE.MeshStandardMaterial({ color: '#050b10', emissive: '#0f3b57', emissiveIntensity: 0.9, roughness: 0.2 }),
      knob: new THREE.MeshStandardMaterial({ color: '#0c0c0c', roughness: 0.35 }),
      windshield: new THREE.MeshStandardMaterial({
        color: '#b6c8d4',
        transparent: true,
        opacity: 0.05,
        roughness: 0.02,
        metalness: 0.4,
        depthWrite: false,
      }),
      green: new THREE.MeshStandardMaterial({ color: '#031', emissive: '#30ff80', emissiveIntensity: 2.2, toneMapped: false }),
    }),
    [stock.accent],
  )

  useFrame(() => {
    const s = stateRef.current
    if (!s || !group.current) return
    group.current.position.z = -s.pos
    if (lever.current) lever.current.rotation.x = -s.notch * 0.075
    if (atpLamp.current) atpLamp.current.emissiveIntensity = s.atpTripped ? (Math.sin(s.time * 12) > 0 ? 4 : 0.2) : 0.15
    if (doorLamp.current) doorLamp.current.emissiveIntensity = s.doorsOpen ? 3 : 0.15
  })

  const slant = -0.42

  return (
    <group ref={group} visible={visible}>
      <mesh geometry={boxGeo} material={m.dash} position={[0, DASH_TOP - 0.45, 0.85]} scale={[2.9, 0.9, 0.9]} />
      <group position={[0, DASH_TOP + 0.08, 0.72]} rotation={[slant, 0, 0]}>
        <mesh geometry={boxGeo} material={m.panel} scale={[2.85, 0.06, 0.7]} />
        <mesh geometry={planeGeo} material={m.screen} position={[-0.75, 0.032, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.5, 0.3, 1]} />
        <mesh geometry={planeGeo} material={m.screen} position={[0.15, 0.032, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.42, 0.26, 1]} />
        {[-1.25, -1.12, -0.99, 0.55, 0.68].map((x, i) => (
          <mesh key={x} geometry={boxGeo} material={i === 0 ? m.green : m.trim} position={[x, 0.045, -0.15]} scale={[0.07, 0.03, 0.07]} />
        ))}
        <mesh geometry={boxGeo} position={[-1.25, 0.045, 0.05]} scale={[0.07, 0.03, 0.07]}>
          <meshStandardMaterial ref={atpLamp} color="#300" emissive="#ff3020" emissiveIntensity={0.15} toneMapped={false} />
        </mesh>
        <mesh geometry={boxGeo} position={[-1.12, 0.045, 0.05]} scale={[0.07, 0.03, 0.07]}>
          <meshStandardMaterial ref={doorLamp} color="#320" emissive="#ffb020" emissiveIntensity={0.15} toneMapped={false} />
        </mesh>
      </group>

      <group position={[0.95, DASH_TOP + 0.12, 1.15]}>
        <mesh geometry={boxGeo} material={m.trim} scale={[0.16, 0.08, 0.36]} />
        <group ref={lever}>
          <mesh geometry={boxGeo} material={m.trim} position={[0, 0.16, 0]} scale={[0.035, 0.3, 0.035]} />
          <mesh material={m.knob} position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.055, 16, 12]} />
          </mesh>
        </group>
      </group>

      <mesh geometry={boxGeo} material={m.shell} position={[-1.42, 2.95, 0.25]} rotation={[0, 0, 0.06]} scale={[0.2, 1.8, 0.14]} />
      <mesh geometry={boxGeo} material={m.shell} position={[1.42, 2.95, 0.25]} rotation={[0, 0, -0.06]} scale={[0.2, 1.8, 0.14]} />
      <mesh geometry={boxGeo} material={m.shell} position={[0, 3.92, 0.45]} scale={[3.1, 0.42, 0.6]} />
      <mesh geometry={boxGeo} material={m.trim} position={[0, DASH_TOP + 0.02, 0.3]} scale={[2.95, 0.06, 0.12]} />
      <mesh geometry={planeGeo} material={m.shell} position={[-1.52, 2.6, 1.3]} rotation={[0, Math.PI / 2, 0]} scale={[2.2, 2.8, 1]} />
      <mesh geometry={planeGeo} material={m.shell} position={[1.52, 2.6, 1.3]} rotation={[0, -Math.PI / 2, 0]} scale={[2.2, 2.8, 1]} />
      <mesh geometry={planeGeo} material={m.shell} position={[0, 4.05, 1.3]} rotation={[Math.PI / 2, 0, 0]} scale={[3.1, 2.2, 1]} />
      <mesh geometry={planeGeo} material={m.windshield} position={[0, 2.95, 0.22]} scale={[2.7, 1.75, 1]} />
      <mesh geometry={boxGeo} material={m.knob} position={[-0.75, 2.1, 0.2]} rotation={[0, 0, 0.1]} scale={[1.0, 0.018, 0.015]} />
    </group>
  )
}
