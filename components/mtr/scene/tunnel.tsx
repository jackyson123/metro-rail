'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { STATIONS } from '@/lib/mtr/engine'
import { SEG, TUNNEL_CY, TUNNEL_R, inStation } from '@/lib/mtr/layout'
import { concreteTexture, exitSignTexture } from '@/lib/mtr/textures'
import { Repeater, type StateRef } from './instancing'

export const TUNNEL_LAMP_SPACING = 24
export const TUNNEL_LAMP_POS: [number, number] = [2.25, 3.05]

export function Tunnel({ stateRef, family }: { stateRef: StateRef; family: string | null }) {
  const r = useMemo(() => {
    const shellGeo = new THREE.CylinderGeometry(TUNNEL_R, TUNNEL_R, SEG, 48, 1, true)
    shellGeo.rotateX(Math.PI / 2)
    const concrete = concreteTexture([6, SEG / 1.5])
    const shellMat = new THREE.MeshStandardMaterial({
      map: concrete,
      bumpMap: concrete,
      bumpScale: 2.2,
      roughness: 0.93,
      metalness: 0,
      side: THREE.BackSide,
    })

    const walkGeo = new THREE.BoxGeometry(0.75, 1.15, SEG)
    const walkMat = new THREE.MeshStandardMaterial({ color: '#6e6b64', roughness: 0.95, map: concreteTexture([1, 2]) })
    const edgeGeo = new THREE.BoxGeometry(0.06, 0.04, SEG)
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#d9b400', roughness: 0.6 })

    const railGeo = new THREE.CylinderGeometry(0.025, 0.025, SEG, 8)
    railGeo.rotateX(Math.PI / 2)
    const postGeo = new THREE.BoxGeometry(0.04, 0.95, 0.04)
    const steelMat = new THREE.MeshStandardMaterial({ color: '#9da2a6', metalness: 0.85, roughness: 0.4 })

    const cableGeo = new THREE.CylinderGeometry(0.035, 0.035, SEG, 8)
    cableGeo.rotateX(Math.PI / 2)
    const cableMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.55 })
    const bracketGeo = new THREE.BoxGeometry(0.32, 0.035, 0.05)
    const bracketMat = new THREE.MeshStandardMaterial({ color: '#5b5e60', metalness: 0.7, roughness: 0.55 })

    const lampGeo = new THREE.BoxGeometry(0.12, 0.12, 1.2)
    const lampMat = new THREE.MeshStandardMaterial({
      color: '#2a2a28',
      emissive: '#ffd6a0',
      emissiveIntensity: 5,
      toneMapped: false,
    })
    const lampHousingGeo = new THREE.BoxGeometry(0.06, 0.22, 1.35)
    const lampHousingMat = new THREE.MeshStandardMaterial({ color: '#3b3c3d', metalness: 0.6, roughness: 0.5 })

    const signGeo = new THREE.PlaneGeometry(0.75, 0.24)
    const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, SEG, 12)
    pipeGeo.rotateX(Math.PI / 2)
    const pipeMat = new THREE.MeshStandardMaterial({ color: '#7d2a22', roughness: 0.6, metalness: 0.3 })

    return {
      shellGeo,
      shellMat,
      walkGeo,
      walkMat,
      edgeGeo,
      edgeMat,
      railGeo,
      postGeo,
      steelMat,
      cableGeo,
      cableMat,
      bracketGeo,
      bracketMat,
      lampGeo,
      lampMat,
      lampHousingGeo,
      lampHousingMat,
      signGeo,
      pipeGeo,
      pipeMat,
    }
  }, [])

  const tunnelRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const s = stateRef.current
    const group = tunnelRef.current
    if (!s || !group) return
    const nearStation = STATIONS.some((station) => Math.abs(s.pos - station.pos) < 52)
    const tunnelStretch = Math.floor(Math.max(0, s.pos) / 250) % 3 === 1
    group.visible = tunnelStretch || nearStation
    group.position.z = -s.pos
  })

  const signMat = useMemo(() => {
    if (!family) return null
    const tex = exitSignTexture(family)
    return new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 1.6, toneMapped: false })
  }, [family])

  const seg = (p: number) => !inStation(p + SEG / 2)
  const CABLES: [number, number][] = [
    [2.36, 1.5],
    [2.4, 1.62],
    [2.43, 1.74],
    [2.45, 1.86],
  ]

  return (
    <group ref={tunnelRef}>
      <Repeater
        stateRef={stateRef}
        spacing={SEG}
        geometry={r.shellGeo}
        material={r.shellMat}
        place={(o, p) => {
          o.position.set(0, TUNNEL_CY, -(p + SEG / 2))
          return seg(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={SEG}
        geometry={r.walkGeo}
        material={r.walkMat}
        place={(o, p) => {
          o.position.set(-2.2, 0.375, -(p + SEG / 2))
          return seg(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={SEG}
        geometry={r.edgeGeo}
        material={r.edgeMat}
        place={(o, p) => {
          o.position.set(-1.85, 0.96, -(p + SEG / 2))
          return seg(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={SEG}
        geometry={r.railGeo}
        material={r.steelMat}
        place={(o, p) => {
          o.position.set(-2.4, 1.9, -(p + SEG / 2))
          return seg(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={3}
        geometry={r.postGeo}
        material={r.steelMat}
        place={(o, p) => {
          o.position.set(-2.4, 1.43, -p)
          return !inStation(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={SEG}
        perSlot={CABLES.length}
        geometry={r.cableGeo}
        material={r.cableMat}
        place={(o, p, k) => {
          o.position.set(CABLES[k][0], CABLES[k][1], -(p + SEG / 2))
          return seg(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={SEG}
        geometry={r.pipeGeo}
        material={r.pipeMat}
        place={(o, p) => {
          o.position.set(-1.55, 4.25, -(p + SEG / 2))
          return seg(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={2}
        perSlot={2}
        geometry={r.bracketGeo}
        material={r.bracketMat}
        place={(o, p, k) => {
          o.position.set(2.42, k === 0 ? 1.44 : 1.8, -p)
          return !inStation(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={TUNNEL_LAMP_SPACING}
        geometry={r.lampGeo}
        material={r.lampMat}
        place={(o, p) => {
          o.position.set(TUNNEL_LAMP_POS[0], TUNNEL_LAMP_POS[1], -p)
          return !inStation(p)
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={TUNNEL_LAMP_SPACING}
        geometry={r.lampHousingGeo}
        material={r.lampHousingMat}
        place={(o, p) => {
          o.position.set(TUNNEL_LAMP_POS[0] + 0.09, TUNNEL_LAMP_POS[1], -p)
          return !inStation(p)
        }}
      />
      {signMat && (
        <Repeater
          stateRef={stateRef}
          spacing={96}
          geometry={r.signGeo}
          material={signMat}
          place={(o, p) => {
            o.position.set(-2.32, 2.55, -(p + 48))
            o.rotation.set(0, 0.35, 0)
            return !inStation(p + 48)
          }}
        />
      )}
    </group>
  )
}
