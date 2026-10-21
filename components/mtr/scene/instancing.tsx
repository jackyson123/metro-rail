'use client'

import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameState } from '@/lib/mtr/engine'
import { VIEW_AHEAD, VIEW_BEHIND } from '@/lib/mtr/layout'

export type StateRef = RefObject<GameState>

export function slotCount(spacing: number) {
  return Math.ceil((VIEW_AHEAD + VIEW_BEHIND) / spacing) + 1
}

type Place = (o: THREE.Object3D, p: number, k: number) => boolean

export function Repeater({
  stateRef,
  spacing,
  perSlot = 1,
  geometry,
  material,
  place,
}: {
  stateRef: StateRef
  spacing: number
  perSlot?: number
  geometry: THREE.BufferGeometry
  material: THREE.Material
  place: Place
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const last = useRef(Number.NaN)
  const slots = slotCount(spacing)

  useFrame(() => {
    const mesh = ref.current
    const s = stateRef.current
    if (!mesh || !s) return
    const index = Math.floor((s.pos - VIEW_BEHIND) / spacing)
    if (index === last.current) return
    last.current = index
    for (let i = 0; i < slots; i++) {
      const p = (index + i) * spacing
      for (let k = 0; k < perSlot; k++) {
        dummy.position.set(0, 0, 0)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        if (!place(dummy, p, k)) dummy.scale.setScalar(0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i * perSlot + k, dummy.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geometry, material, slots * perSlot]} frustumCulled={false} />
}

export type Xform = {
  p: [number, number, number]
  s?: [number, number, number]
  r?: [number, number, number]
  c?: string
}

export function StaticInstances({
  geometry,
  material,
  items,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: Xform[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    const col = new THREE.Color()
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.rotation.set(...(it.r ?? [0, 0, 0]))
      o.scale.set(...(it.s ?? [1, 1, 1]))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      if (it.c) mesh.setColorAt(i, col.set(it.c))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} />
}
