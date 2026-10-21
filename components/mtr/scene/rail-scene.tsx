'use client'

import { Suspense, memo, useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { STATIONS } from '@/lib/mtr/engine'
import { STATION_BOXES } from '@/lib/mtr/layout'
import { CabInterior } from './cab-interior'
import { CameraRig, type CameraMode } from './camera-rig'
import type { StateRef } from './instancing'
import { Lights } from './lights'
import { Station } from './station'
import { Track } from './track'
import { Train } from './train'
import { Tunnel } from './tunnel'

function useCjkFontFamily() {
  const [family, setFamily] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const fam = getComputedStyle(document.body).fontFamily
    const sample = `${STATIONS.map((s) => s.zh + s.en).join('')}停緊急出口EMERGENCY EXIT0123456789`
    Promise.all([document.fonts.load(`900 64px ${fam}`, sample), document.fonts.load(`700 64px ${fam}`, sample)])
      .catch(() => undefined)
      .finally(() => alive && setFamily(fam))
    return () => {
      alive = false
    }
  }, [])
  return family
}

function DoorAnimator({ stateRef, doorRef }: { stateRef: StateRef; doorRef: RefObject<number> }) {
  useFrame((_, dt) => {
    const s = stateRef.current
    if (!s) return
    const target = s.doorsOpen ? 1 : 0
    const cur = doorRef.current ?? 0
    const step = Math.min(dt, 0.05) * 0.55
    const next = target > cur ? Math.min(target, cur + step) : Math.max(target, cur - step)
    doorRef.current = Math.round(next * 1000) / 1000
  })
  return null
}

export const RailScene = memo(function RailScene({ stateRef, mode }: { stateRef: StateRef; mode: CameraMode }) {
  const doorRef = useRef(0)
  const family = useCjkFontFamily()

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 62, near: 0.05, far: 700, position: [0.28, 2.6, 1.45] }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <color attach="background" args={['#020203']} />
      <fog attach="fog" args={['#030304', 45, 430]} />
      <DoorAnimator stateRef={stateRef} doorRef={doorRef} />
      <CameraRig stateRef={stateRef} mode={mode} />
      <Lights stateRef={stateRef} />

      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#fff8ee" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[14, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#e8eef4" position={[-6, 3, 0]} rotation-y={Math.PI / 2} scale={[14, 1.5, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffd9a8" position={[6, 2.5, 0]} rotation-y={-Math.PI / 2} scale={[14, 1, 1]} />
        <Lightformer form="rect" intensity={0.3} color="#7c8a99" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[14, 14, 1]} />
      </Environment>

      <Tunnel stateRef={stateRef} family={family} />
      <Track stateRef={stateRef} />
      <Suspense fallback={null}>
        {STATION_BOXES.map((b) => (
          <Station key={b.index} index={b.index} family={family} stateRef={stateRef} doorRef={doorRef} />
        ))}
      </Suspense>
      <Train stateRef={stateRef} doorRef={doorRef} family={family} visible={mode !== 'cab'} />
      <CabInterior stateRef={stateRef} visible={mode === 'cab'} />

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.75} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.32} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  )
})
