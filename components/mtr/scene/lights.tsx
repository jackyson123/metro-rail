'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BODY_Y, PLATFORM_CEIL, STATION_CEIL, inStation, stationProximity } from '@/lib/mtr/layout'
import { TUNNEL_LAMP_POS, TUNNEL_LAMP_SPACING } from './tunnel'
import type { StateRef } from './instancing'

const TUNNEL_POOL = 5
const STATION_POOL = 8
const OUTDOOR_SKY = new THREE.Color('#8faec2')
const INDOOR_SKY = new THREE.Color('#16212a')
const OUTDOOR_FOG = new THREE.Color('#8eabb7')
const INDOOR_FOG = new THREE.Color('#17232b')

export function Lights({ stateRef }: { stateRef: StateRef }) {
  const scene = useThree((s) => s.scene)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const spotL = useRef<THREE.SpotLight>(null)
  const spotR = useRef<THREE.SpotLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
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

    const nearStation = prox.distance < 260
    const tunnelStretch = Math.floor(Math.max(0, s.pos) / 250) % 3 === 1
    const outdoor = !tunnelStretch && !nearStation
    const weatherDim = s.weather === 'rain' ? 0.78 : 1

    if (hemi.current) hemi.current.intensity = (outdoor ? 0.9 : 0.42 + 0.42 * prox.factor) * weatherDim
    scene.environmentIntensity = (outdoor ? 1.05 : 0.38 + 0.42 * prox.factor) * weatherDim
    scene.background = outdoor ? OUTDOOR_SKY : INDOOR_SKY
    if (scene.fog) scene.fog.color.copy(outdoor ? OUTDOOR_FOG : INDOOR_FOG)
    if (sun.current) {
      sun.current.visible = outdoor
      sun.current.intensity = (s.weather === 'rain' ? 1.15 : 2.1)
      sun.current.position.set(-18, 28, z + 28)
      sun.current.target.position.set(0, 0, z - 55)
      sun.current.target.updateMatrixWorld()
    }

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
      <ambientLight color="#b8c9d4" intensity={0.28} />
      <hemisphereLight ref={hemi} args={['#e8edf2', '#3b352c', 0.52]} />
      <directionalLight ref={sun} color="#fff4d6" intensity={2.1} position={[-18, 28, 28]} castShadow={false} />
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
