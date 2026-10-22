'use client'

import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three-stdlib'
import { STATIONS } from '@/lib/mtr/engine'
import { getRollingStock, type RollingStock } from '@/lib/mtr/rolling-stock'
import { BODY_H, BODY_W, BODY_Y, CARS, CAR_GAP, CAR_LEN, DOOR_OFFSETS, TRAIN_LEN } from '@/lib/mtr/layout'
import { brushedSteelTexture, carInteriorTexture, destinationTexture, trainDoorTexture } from '@/lib/mtr/textures'
import { StaticInstances, type StateRef, type Xform } from './instancing'

const HALF_W = BODY_W / 2
const BODY_CY = BODY_Y + BODY_H / 2
const ROOF_Y = BODY_Y + BODY_H
const WHEEL_R = 0.43
const DOOR_H = 1.95
const DOOR_Y = BODY_Y + 0.08 + DOOR_H / 2
const LEAF_W = 0.68

const planeGeo = new THREE.PlaneGeometry(1, 1)
const boxGeo = new THREE.BoxGeometry(1, 1, 1)

function carStart(i: number) {
  return i * (CAR_LEN + CAR_GAP)
}

export function Train({
  stateRef,
  doorRef,
  rollingStockId,
  family,
  visible,
}: {
  stateRef: StateRef
  doorRef: RefObject<number>
  rollingStockId: RollingStock['id']
  family: string | null
  visible: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const wheels = useRef<THREE.InstancedMesh>(null)
  const leftLeaves = useRef<THREE.InstancedMesh>(null)
  const lastOpen = useRef(-1)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const m = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({ map: brushedSteelTexture([3, 1]), color: '#e4e7ea', metalness: 0.78, roughness: 0.34 })
    const glass = new THREE.MeshStandardMaterial({ color: '#0a0e12', metalness: 0.7, roughness: 0.08 })
    const stock = getRollingStock(rollingStockId)
    const red = new THREE.MeshStandardMaterial({ color: stock.accent, roughness: 0.42, metalness: 0.2 })
    const blue = new THREE.MeshStandardMaterial({ color: stock.id === 'mtrain' ? '#d7e5ef' : '#0a5fb4', roughness: 0.42, metalness: 0.2 })
    const door = new THREE.MeshStandardMaterial({ map: trainDoorTexture(), metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide })
    const interior = new THREE.MeshStandardMaterial({ map: carInteriorTexture(), emissiveMap: carInteriorTexture(), emissive: '#ffffff', emissiveIntensity: 0.9 })
    const dark = new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.75, metalness: 0.3 })
    const grey = new THREE.MeshStandardMaterial({ color: '#8d9196', roughness: 0.55, metalness: 0.5 })
    const wheel = new THREE.MeshStandardMaterial({ color: '#55585c', metalness: 0.95, roughness: 0.35 })
    const rubber = new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.9 })
    const head = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6e0', emissiveIntensity: 8, toneMapped: false })
    const tail = new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff1a0e', emissiveIntensity: 5, toneMapped: false })
    const mask = new THREE.MeshStandardMaterial({ color: '#141619', metalness: 0.4, roughness: 0.3 })
    return { body, glass, red, blue, door, interior, dark, grey, wheel, rubber, head, tail, mask }
  }, [rollingStockId])

  const destMat = useMemo(() => {
    if (!family) return null
    const last = STATIONS[STATIONS.length - 1]
    const t = destinationTexture(family, last.zh, last.en)
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 2.2, toneMapped: false })
  }, [family])

  const geo = useMemo(() => {
    const body = new RoundedBoxGeometry(BODY_W, BODY_H, CAR_LEN, 4, 0.17)
    const wheel = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.13, 24)
    wheel.rotateZ(Math.PI / 2)
    const disc = new THREE.CircleGeometry(1, 28)
    return { body, wheel, disc }
  }, [])

  const items = useMemo(() => {
    const bodies: Xform[] = []
    const windows: Xform[] = []
    const stripes: Xform[] = []
    const blues: Xform[] = []
    const rightLeaves: Xform[] = []
    const doorways: Xform[] = []
    const bogies: Xform[] = []
    const underframe: Xform[] = []
    const roof: Xform[] = []
    const gangways: Xform[] = []
    for (let i = 0; i < CARS; i++) {
      const z0 = carStart(i)
      const zc = z0 + CAR_LEN / 2
      bodies.push({ p: [0, BODY_CY, zc] })
      for (const side of [-1, 1]) {
        const x = side * (HALF_W + 0.006)
        const rot: [number, number, number] = [0, side * (Math.PI / 2), 0]
        windows.push({ p: [x, BODY_Y + 2.05, zc], r: rot, s: [CAR_LEN - 1.4, 0.92, 1] })
        stripes.push({ p: [side * (HALF_W + 0.007), BODY_Y + 1.3, zc], r: rot, s: [CAR_LEN - 0.5, 0.2, 1] })
        blues.push({ p: [side * (HALF_W + 0.007), BODY_Y + 1.16, zc], r: rot, s: [CAR_LEN - 0.5, 0.05, 1] })
      }
      for (const off of DOOR_OFFSETS) {
        const dz = z0 + off
        doorways.push({ p: [-(HALF_W + 0.009), DOOR_Y, dz], r: [0, -Math.PI / 2, 0], s: [LEAF_W * 2, DOOR_H, 1] })
        for (const dir of [-1, 1]) {
          rightLeaves.push({ p: [HALF_W + 0.014, DOOR_Y, dz + dir * (LEAF_W / 2)], r: [0, Math.PI / 2, 0], s: [dir * LEAF_W, DOOR_H, 1] })
        }
      }
      for (const b of [-1, 1]) {
        bogies.push({ p: [0, 0.62, zc + b * (CAR_LEN / 2 - 3.4)], s: [2.2, 0.5, 2.9] })
      }
      underframe.push({ p: [0, BODY_Y - 0.05, zc], s: [2.6, 0.5, 9] })
      roof.push({ p: [0, ROOF_Y + 0.12, zc], s: [2.1, 0.28, 5.5] })
      if (i < CARS - 1) gangways.push({ p: [0, BODY_CY - 0.1, z0 + CAR_LEN + CAR_GAP / 2], s: [2.3, 2.8, CAR_GAP + 0.2] })
    }
    return { bodies, windows, stripes, blues, rightLeaves, doorways, bogies, underframe, roof, gangways }
  }, [])

  const wheelSlots = useMemo(() => {
    const out: [number, number][] = []
    for (let i = 0; i < CARS; i++) {
      const zc = carStart(i) + CAR_LEN / 2
      for (const b of [-1, 1]) {
        const bz = zc + b * (CAR_LEN / 2 - 3.4)
        for (const a of [-1.05, 1.05]) for (const x of [-0.72, 0.72]) out.push([x, bz + a])
      }
    }
    return out
  }, [])

  const leftCount = DOOR_OFFSETS.length * CARS * 2

  useFrame((_, dt) => {
    const s = stateRef.current
    if (!s || !group.current) return
    group.current.position.z = -s.pos
    if (!visible) return

    const w = wheels.current
    if (w) {
      const angle = -s.pos / WHEEL_R
      wheelSlots.forEach(([x, z], i) => {
        dummy.position.set(x, WHEEL_R, z)
        dummy.rotation.set(angle, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        w.setMatrixAt(i, dummy.matrix)
      })
      w.instanceMatrix.needsUpdate = true
    }

    const open = doorRef.current ?? 0
    const ll = leftLeaves.current
    if (ll && open !== lastOpen.current) {
      lastOpen.current = open
      let n = 0
      for (let i = 0; i < CARS; i++) {
        for (const off of DOOR_OFFSETS) {
          const dz = carStart(i) + off
          for (const dir of [-1, 1]) {
            dummy.position.set(-(HALF_W + 0.016), DOOR_Y, dz + dir * (LEAF_W / 2 + open * (LEAF_W - 0.04)))
            dummy.rotation.set(0, -Math.PI / 2, 0)
            dummy.scale.set(-dir * LEAF_W, DOOR_H, 1)
            dummy.updateMatrix()
            ll.setMatrixAt(n++, dummy.matrix)
          }
        }
      }
      ll.instanceMatrix.needsUpdate = true
    }
    void dt
  })

  return (
    <group ref={group} visible={visible}>
      <StaticInstances geometry={geo.body} material={m.body} items={items.bodies} />
      <StaticInstances geometry={planeGeo} material={m.glass} items={items.windows} />
      <StaticInstances geometry={planeGeo} material={m.red} items={items.stripes} />
      <StaticInstances geometry={planeGeo} material={m.blue} items={items.blues} />
      <StaticInstances geometry={planeGeo} material={m.interior} items={items.doorways} />
      <StaticInstances geometry={planeGeo} material={m.door} items={items.rightLeaves} />
      <instancedMesh ref={leftLeaves} args={[planeGeo, m.door, leftCount]} frustumCulled={false} />
      <StaticInstances geometry={boxGeo} material={m.dark} items={items.bogies} />
      <StaticInstances geometry={boxGeo} material={m.dark} items={items.underframe} />
      <StaticInstances geometry={boxGeo} material={m.grey} items={items.roof} />
      <StaticInstances geometry={boxGeo} material={m.rubber} items={items.gangways} />
      <instancedMesh ref={wheels} args={[geo.wheel, m.wheel, wheelSlots.length]} frustumCulled={false} />

      {[1, 6].map((i) => (
        <Pantograph key={i} z={carStart(i) + 5} m={m} />
      ))}

      <group position={[0, 0, -0.035]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={planeGeo} material={m.mask} position={[0, BODY_Y + 2.05, 0]} scale={[2.92, 1.58, 1]} />
        <mesh geometry={planeGeo} material={m.glass} position={[0, BODY_Y + 2.1, 0.012]} scale={[2.55, 1.1, 1]} />
        {destMat && <mesh geometry={planeGeo} material={destMat} position={[0, BODY_Y + 2.95, 0.003]} scale={[1.5, 0.28, 1]} />}
        <mesh geometry={planeGeo} material={m.red} position={[0, BODY_Y + 1.3, 0.002]} scale={[2.95, 0.2, 1]} />
        {[-1, 1].map((x) => (
          <group key={x}>
            <mesh geometry={geo.disc} material={m.mask} position={[x * 0.98, BODY_Y + 0.62, 0.002]} scale={0.2} />
            <mesh geometry={geo.disc} material={m.head} position={[x * 0.98, BODY_Y + 0.62, 0.004]} scale={0.13} />
            <mesh geometry={geo.disc} material={m.head} position={[x * 1.25, BODY_Y + 0.95, 0.004]} scale={0.05} />
          </group>
        ))}
      </group>
      <mesh geometry={boxGeo} material={m.dark} position={[0, BODY_Y + 0.05, -0.25]} scale={[0.35, 0.3, 0.6]} />

      <group position={[0, 0, TRAIN_LEN + 0.004]}>
        {[-1, 1].map((x) => (
          <mesh key={x} geometry={geo.disc} material={m.tail} position={[x * 0.98, BODY_Y + 0.62, 0]} scale={0.11} />
        ))}
      </group>
    </group>
  )
}

function Pantograph({ z, m }: { z: number; m: { dark: THREE.Material; grey: THREE.Material } }) {
  const lower = 0.55
  const upper = 0.62
  return (
    <group position={[0, ROOF_Y, z]}>
      <mesh geometry={boxGeo} material={m.dark} position={[0, 0.06, 0]} scale={[1.6, 0.12, 1.4]} />
      <mesh geometry={boxGeo} material={m.grey} position={[0, 0.2, 0.3]} rotation={[-0.95, 0, 0]} scale={[0.06, 0.06, lower]} />
      <mesh geometry={boxGeo} material={m.grey} position={[0, 0.25, -0.05]} rotation={[0.75, 0, 0]} scale={[0.05, 0.05, upper]} />
      <mesh geometry={boxGeo} material={m.grey} position={[0, 0.48 - 0.17, -0.2]} scale={[1.5, 0.05, 0.08]} />
    </group>
  )
}
