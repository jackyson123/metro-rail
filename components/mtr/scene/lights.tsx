'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BODY_Y, PLATFORM_CEIL, STATION_CEIL, inStation, stationProximity } from '@/lib/mtr/layout'
import { TUNNEL_LAMP_POS, TUNNEL_LAMP_SPACING } from './tunnel'
import type { StateRef } from './instancing'

const TUNNEL_POOL = 5
const STATION_POOL = 8

export function Lights({ stateRef }: { stateRef: StateRef }) {
  const scene = useThree((s) => s.scene)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const spotL = useRef<THREE.SpotLight>(null)
  const spotR = useRef<THREE.SpotLight>(null)
  const tunnel = useRef<(THREE.PointLight | null)[]>([])
  const station = useRef<(THREE.PointLight | null)[]>([])
  const targets = useMemo(() => [new THREE.Object3D(), new THREE.Object3D()], [])

  useEffect(() => {
    if (spotL.current) spotL.current.target = targets[0]
    if (spotR.current) spotR.current.target = targets[1]
  }, [targets])

  useFrame(() => {
    const s = stateRef.current
    if (!s) return
    const z = -s.pos
    const prox = stationProximity(s.pos)

    if (hemi.current) hemi.current.intensity = 0.05 + 1.25 * prox.factor
    scene.environmentIntensity = 0.12 + 0.5 * prox.factor

    const spots = [spotL.current, spotR.current]
    spots.forEach((sp, i) => {
      if (!sp) return
      const x = i === 0 ? -0.98 : 0.98
      sp.position.set(x, BODY_Y + 0.62, z - 0.1)
      targets[i].position.set(x * 0.4, 0.8, z - 50)
      targets[i].updateMatrixWorld()
    })

    const first = Math.floor(s.pos / TUNNEL_LAMP_SPACING) - 1
    for (let k = 0; k < TUNNEL_POOL; k++) {
      const l = tunnel.current[k]
      if (!l) continue
      const p = (first + k) * TUNNEL_LAMP_SPACING
      l.position.set(TUNNEL_LAMP_POS[0] - 0.25, TUNNEL_LAMP_POS[1], -p)
      l.intensity = inStation(p) ? 0 : 9
    }

    const st = prox.box.st
    const near = prox.distance < 260
    for (let k = 0; k < STATION_POOL; k++) {
      const l = station.current[k]
      if (!l) continue
      const local = -10 + Math.floor(k / 2) * 52
      const trackSide = k % 2 === 0
      l.position.set(trackSide ? 0.3 : -6.5, trackSide ? STATION_CEIL - 0.15 : PLATFORM_CEIL - 0.15, -(st.pos - local - (trackSide ? 0 : 26)))
      l.intensity = near ? (trackSide ? 7 : 6) : 0
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#e8edf2', '#3b352c', 0.06]} />
      <spotLight ref={spotL} color="#fff3dc" intensity={260} distance={170} angle={0.36} penumbra={0.8} decay={1.3} />
      <spotLight ref={spotR} color="#fff3dc" intensity={260} distance={170} angle={0.36} penumbra={0.8} decay={1.3} />
      {targets.map((t, i) => (
        <primitive key={i} object={t} />
      ))}
      {Array.from({ length: TUNNEL_POOL }, (_, k) => (
        <pointLight
          key={`t${k}`}
          ref={(el) => {
            tunnel.current[k] = el
          }}
          color="#ffd39a"
          intensity={9}
          distance={18}
          decay={2}
        />
      ))}
      {Array.from({ length: STATION_POOL }, (_, k) => (
        <pointLight
          key={`s${k}`}
          ref={(el) => {
            station.current[k] = el
          }}
          color="#f6f3ec"
          intensity={0}
          distance={60}
          decay={0.55}
        />
      ))}
    </>
  )
}
