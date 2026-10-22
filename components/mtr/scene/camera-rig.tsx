'use client'

import { useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { inStation } from '@/lib/mtr/layout'
import type { StateRef } from './instancing'

export type CameraMode = 'cab' | 'front' | 'platform'

export const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: 'cab', label: '駕駛室' },
  { id: 'front', label: '車頭外' },
  { id: 'platform', label: '月台側' },
]

export function CameraRig({ stateRef, mode }: { stateRef: StateRef; mode: CameraMode }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera

  useFrame(() => {
    const s = stateRef.current
    if (!s) return
    const z = -s.pos
    const bend = Math.sin(s.pos * 0.00165) * 0.72 + Math.sin(s.pos * 0.0041) * 0.18
    const shake = Math.min(s.v, 25) / 25
    const t = s.time
    const jx = Math.sin(t * 1.7) * 0.012 * shake + Math.sin(t * 7.3) * 0.003 * shake
    const jy = Math.sin(t * 11) * 0.006 * shake + Math.sin(t * 2.9) * 0.008 * shake

    let fov = 62
    if (mode === 'cab') {
      camera.position.set(0.28 + bend + jx, 2.48 + jy, z + 1.5)
      camera.lookAt(0.12 + bend * 2, 2.05, z - 80)
    } else if (mode === 'front') {
      fov = 55
      // Keep the exterior camera on the track centreline and well ahead of the nose.
      // The previous offset put the camera inside the rounded side of the train on bends.
      camera.position.set(bend * 0.2, 3.0, z - 20)
      camera.lookAt(bend * 0.7, 2.05, z + 20)
    } else {
      fov = 58
      const onPlatform = inStation(s.pos - 15) && inStation(s.pos + 30)
      camera.position.set(onPlatform ? -4.6 : -2.25, onPlatform ? 2.75 : 2.85, z + 15)
      camera.lookAt(onPlatform ? -1.2 : -0.5, 2.3, z - 30)
    }
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  })

  return null
}
