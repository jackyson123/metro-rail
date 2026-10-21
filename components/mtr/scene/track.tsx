'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { SEG } from '@/lib/mtr/layout'
import { concreteTexture, trackbedTexture } from '@/lib/mtr/textures'
import { Repeater, type StateRef } from './instancing'

const GAUGE_HALF = 0.7175
const SLEEPER = 0.65
const RAIL_LEN = 12

function railProfile() {
  const s = new THREE.Shape()
  s.moveTo(-0.07, 0)
  s.lineTo(0.07, 0)
  s.lineTo(0.07, 0.012)
  s.lineTo(0.012, 0.03)
  s.lineTo(0.009, 0.105)
  s.lineTo(0.036, 0.113)
  s.lineTo(0.036, 0.15)
  s.lineTo(-0.036, 0.15)
  s.lineTo(-0.036, 0.113)
  s.lineTo(-0.009, 0.105)
  s.lineTo(-0.012, 0.03)
  s.lineTo(-0.07, 0.012)
  s.closePath()
  return s
}

export function Track({ stateRef }: { stateRef: StateRef }) {
  const r = useMemo(() => {
    const bedGeo = new THREE.BoxGeometry(3.5, 0.3, SEG)
    const bedMat = new THREE.MeshStandardMaterial({ map: trackbedTexture([1, SEG / 3]), roughness: 0.96 })

    const blockGeo = new THREE.BoxGeometry(0.62, 0.12, 0.26)
    const blockMat = new THREE.MeshStandardMaterial({ map: concreteTexture([0.3, 0.3]), color: '#c9c5bb', roughness: 0.9 })

    const padGeo = new THREE.BoxGeometry(0.16, 0.012, 0.2)
    const padMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.8 })
    const clipGeo = new THREE.BoxGeometry(0.05, 0.045, 0.1)
    const clipMat = new THREE.MeshStandardMaterial({ color: '#2b3f57', metalness: 0.5, roughness: 0.5 })

    const railGeo = new THREE.ExtrudeGeometry(railProfile(), { depth: RAIL_LEN, bevelEnabled: false })
    const railMat = new THREE.MeshStandardMaterial({ color: '#8f9398', metalness: 1, roughness: 0.32 })

    const conductorGeo = new THREE.BoxGeometry(0.14, 0.1, RAIL_LEN)
    const conductorMat = new THREE.MeshStandardMaterial({ color: '#b8bcc0', metalness: 0.9, roughness: 0.35 })
    const wireGeo = new THREE.BoxGeometry(0.025, 0.025, RAIL_LEN)
    const wireMat = new THREE.MeshStandardMaterial({ color: '#b5703f', metalness: 1, roughness: 0.3 })
    const hangerGeo = new THREE.BoxGeometry(0.05, 1.2, 0.05)
    const insulatorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.22, 10)
    const insulatorMat = new THREE.MeshStandardMaterial({ color: '#7b2a1f', roughness: 0.4 })

    return {
      bedGeo,
      bedMat,
      blockGeo,
      blockMat,
      padGeo,
      padMat,
      clipGeo,
      clipMat,
      railGeo,
      railMat,
      conductorGeo,
      conductorMat,
      wireGeo,
      wireMat,
      hangerGeo,
      insulatorGeo,
      insulatorMat,
    }
  }, [])

  const side = (k: number) => (k % 2 === 0 ? -GAUGE_HALF : GAUGE_HALF)

  return (
    <group>
      <Repeater
        stateRef={stateRef}
        spacing={SEG}
        geometry={r.bedGeo}
        material={r.bedMat}
        place={(o, p) => {
          o.position.set(0, -0.33, -(p + SEG / 2))
          return true
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={SLEEPER}
        perSlot={2}
        geometry={r.blockGeo}
        material={r.blockMat}
        place={(o, p, k) => {
          o.position.set(side(k), -0.21, -p)
          return true
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={SLEEPER}
        perSlot={2}
        geometry={r.padGeo}
        material={r.padMat}
        place={(o, p, k) => {
          o.position.set(side(k), -0.144, -p)
          return true
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={SLEEPER}
        perSlot={4}
        geometry={r.clipGeo}
        material={r.clipMat}
        place={(o, p, k) => {
          const x = side(k) + (k < 2 ? -0.085 : 0.085)
          o.position.set(x, -0.125, -p)
          return true
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={RAIL_LEN}
        perSlot={2}
        geometry={r.railGeo}
        material={r.railMat}
        place={(o, p, k) => {
          o.position.set(side(k), -0.15, -p - RAIL_LEN)
          return true
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={RAIL_LEN}
        geometry={r.conductorGeo}
        material={r.conductorMat}
        place={(o, p) => {
          o.position.set(0, 4.52, -(p + RAIL_LEN / 2))
          return true
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={RAIL_LEN}
        geometry={r.wireGeo}
        material={r.wireMat}
        place={(o, p) => {
          o.position.set(0, 4.455, -(p + RAIL_LEN / 2))
          return true
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={8}
        geometry={r.hangerGeo}
        material={r.conductorMat}
        place={(o, p) => {
          o.position.set(0, 5.2, -p)
          return true
        }}
      />
      <Repeater
        stateRef={stateRef}
        spacing={8}
        geometry={r.insulatorGeo}
        material={r.insulatorMat}
        place={(o, p) => {
          o.position.set(0, 4.68, -p)
          return true
        }}
      />
    </group>
  )
}
