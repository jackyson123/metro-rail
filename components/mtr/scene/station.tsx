'use client'

import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { STATIONS } from '@/lib/mtr/engine'
import {
  DOOR_CENTERS,
  PLATFORM_CEIL,
  PLATFORM_EDGE_X,
  PLATFORM_FAR_X,
  PLATFORM_Y,
  PSD_END,
  PSD_OPEN_W,
  PSD_PANELS,
  PSD_START,
  PSD_TOP,
  PSD_X,
  STATION_BOXES,
  STATION_CEIL,
  TRACK_WALL_X,
  TRAIN_LEN,
  TUNNEL_CY,
  TUNNEL_R,
} from '@/lib/mtr/layout'
import {
  ceilingTexture,
  concreteTexture,
  graniteTexture,
  headerStripTexture,
  nameWallTexture,
  psdLeafTexture,
  stopBoardTexture,
  tileTexture,
} from '@/lib/mtr/textures'
import { StaticInstances, type StateRef, type Xform } from './instancing'

const AD_URLS = ['/images/ads/ad-1.jpg', '/images/ads/ad-2.jpg', '/images/ads/ad-3.jpg']
const ROT_FACE_NEG_X: [number, number, number] = [0, -Math.PI / 2, 0]
const ROT_FACE_POS_X: [number, number, number] = [0, Math.PI / 2, 0]
const PSD_H = PSD_TOP - PLATFORM_Y
const CLOTHES = ['#1f2a44', '#e7e3da', '#38393d', '#6b2730', '#2f4a3a', '#c9b79c', '#4d5a6e', '#111214', '#8a8f96', '#a1453a']
const SKIN = ['#e9c6a5', '#d9ad86', '#c58f66', '#f0d2b6']

function rand(seed: number) {
  let a = seed
  return () => {
    a = (a * 16807) % 2147483647
    return (a - 1) / 2147483646
  }
}

const planeGeo = new THREE.PlaneGeometry(1, 1)
const boxGeo = new THREE.BoxGeometry(1, 1, 1)

export function Station({
  index,
  family,
  stateRef,
  doorRef,
}: {
  index: number
  family: string | null
  stateRef: StateRef
  doorRef: RefObject<number>
}) {
  const box = STATION_BOXES[index]
  const st = box.st
  const group = useRef<THREE.Group>(null)
  const leaves = useRef<THREE.InstancedMesh>(null)
  const redLamp = useRef<THREE.MeshStandardMaterial>(null)
  const greenLamp = useRef<THREE.MeshStandardMaterial>(null)
  const lastDoor = useRef(-1)
  const ads = useTexture(AD_URLS)

  const zFront = -(box.end - st.pos)
  const zBack = st.pos - box.start
  const len = zBack - zFront
  const zMid = (zFront + zBack) / 2
  const psdLen = PSD_END - PSD_START
  const psdMid = (PSD_START + PSD_END) / 2

  const m = useMemo(() => {
    ads.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
    })
    const tile = st.tile
    const trackWall = new THREE.MeshStandardMaterial({ map: tileTexture(tile, [len / 1.6, STATION_CEIL / 1.6]), roughness: 0.5 })
    const farWall = new THREE.MeshStandardMaterial({ map: tileTexture(tile, [len / 1.6, PLATFORM_CEIL / 1.6]), roughness: 0.32 })
    const endWallTile = new THREE.MeshStandardMaterial({ map: tileTexture(tile, [8, 4]), roughness: 0.35, side: THREE.DoubleSide })
    const dado = new THREE.MeshStandardMaterial({ color: '#2a2c2f', roughness: 0.5 })
    const ceilTrack = new THREE.MeshStandardMaterial({ map: ceilingTexture([len / 3, 2]), roughness: 0.7 })
    const ceilPlat = new THREE.MeshStandardMaterial({ map: ceilingTexture([len / 3, 4]), roughness: 0.7 })
    const floor = new THREE.MeshStandardMaterial({ map: graniteTexture([10 / 2.4, len / 2.4]), roughness: 0.28, metalness: 0.05 })
    const pitFloor = new THREE.MeshStandardMaterial({ map: concreteTexture([2, len / 3]), color: '#5a5852', roughness: 0.95 })
    const edgeFace = new THREE.MeshStandardMaterial({ map: concreteTexture([len / 3, 1]), color: '#8b877e', roughness: 0.9 })
    const tactile = new THREE.MeshStandardMaterial({ color: '#e0b400', roughness: 0.6 })
    const steel = new THREE.MeshStandardMaterial({ color: '#9ea4aa', metalness: 0.7, roughness: 0.42 })
    const darkMetal = new THREE.MeshStandardMaterial({ color: '#2a2d31', metalness: 0.6, roughness: 0.45 })
    const glass = new THREE.MeshStandardMaterial({
      color: '#a9c4cc',
      transparent: true,
      opacity: 0.16,
      roughness: 0.04,
      metalness: 0.1,
      depthWrite: false,
    })
    const leaf = new THREE.MeshStandardMaterial({
      map: psdLeafTexture(),
      transparent: true,
      roughness: 0.1,
      metalness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const lightStrip = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff8ec', emissiveIntensity: 3.2, toneMapped: false })
    const doorLamp = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffb347', emissiveIntensity: 2.5, toneMapped: false })
    const pillar = new THREE.MeshStandardMaterial({ map: tileTexture(tile, [2, 2.5]), roughness: 0.32 })
    const adMats = ads.map(
      (t) => new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.85, roughness: 0.2 }),
    )
    const people = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 })
    return { trackWall, farWall, endWallTile, dado, ceilTrack, ceilPlat, floor, pitFloor, edgeFace, tactile, steel, darkMetal, glass, leaf, lightStrip, doorLamp, pillar, adMats, people }
  }, [ads, st.tile, len])

  const text = useMemo(() => {
    if (!family) return null
    const header = headerStripTexture(family, st.zh, st.en, st.tile, [psdLen / 16, 1])
    const name = nameWallTexture(family, st.zh, st.en, st.tile)
    const stop = stopBoardTexture(family)
    return {
      header: new THREE.MeshStandardMaterial({ map: header, emissiveMap: header, emissive: '#ffffff', emissiveIntensity: 1.1, toneMapped: false }),
      name: new THREE.MeshStandardMaterial({ map: name, roughness: 0.25 }),
      stop: new THREE.MeshStandardMaterial({ map: stop, emissiveMap: stop, emissive: '#ffffff', emissiveIntensity: 0.6 }),
    }
  }, [family, st, psdLen])

  const geo = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(PLATFORM_FAR_X, -0.4)
    shape.lineTo(TRACK_WALL_X, -0.4)
    shape.lineTo(TRACK_WALL_X, STATION_CEIL)
    shape.lineTo(PLATFORM_FAR_X, STATION_CEIL)
    shape.closePath()
    const hole = new THREE.Path()
    hole.absarc(0, TUNNEL_CY, TUNNEL_R, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const endWall = new THREE.ShapeGeometry(shape, 48)
    const pillar = new THREE.CylinderGeometry(0.42, 0.42, PLATFORM_CEIL - PLATFORM_Y, 24, 1, true)
    const body = new THREE.CapsuleGeometry(0.2, 0.95, 4, 10)
    const head = new THREE.SphereGeometry(0.115, 14, 10)
    const lamp = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16)
    lamp.rotateZ(Math.PI / 2)
    return { endWall, pillar, body, head, lamp }
  }, [])

  const items = useMemo(() => {
    const panels: Xform[] = PSD_PANELS.map(([a, b]) => ({
      p: [PSD_X, PLATFORM_Y + PSD_H / 2, (a + b) / 2],
      s: [0.03, PSD_H, b - a],
    }))
    const mullions: Xform[] = []
    const lamps: Xform[] = []
    for (const c of DOOR_CENTERS) {
      for (const e of [c - PSD_OPEN_W / 2, c + PSD_OPEN_W / 2]) {
        mullions.push({ p: [PSD_X + 0.02, PLATFORM_Y + PSD_H / 2, e], s: [0.1, PSD_H, 0.1] })
      }
      lamps.push({ p: [PSD_X + 0.28, PSD_TOP + 0.1, c] })
    }
    for (let z = PSD_START; z <= PSD_END; z += 1.6) {
      mullions.push({ p: [PSD_X, PLATFORM_Y + PSD_H / 2, z], s: [0.05, PSD_H, 0.05] })
    }
    const trackLights: Xform[] = []
    for (let z = zFront + 3; z < zBack - 2; z += 5) trackLights.push({ p: [0.9, STATION_CEIL - 0.03, z], s: [0.3, 0.05, 3.2] })
    const platLights: Xform[] = []
    for (let z = zFront + 3; z < zBack - 2; z += 4.5) {
      platLights.push({ p: [-3.4, PLATFORM_CEIL - 0.02, z], s: [0.2, 0.04, 3.4] })
      platLights.push({ p: [-8.4, PLATFORM_CEIL - 0.02, z], s: [0.2, 0.04, 3.4] })
    }
    const pillars: Xform[] = []
    const benches: Xform[] = []
    for (let z = 4; z < TRAIN_LEN; z += 9) {
      pillars.push({ p: [-6.6, (PLATFORM_Y + PLATFORM_CEIL) / 2, z] })
      if (Math.round(z / 9) % 2 === 0) benches.push({ p: [-7.6, PLATFORM_Y + 0.23, z + 4.5], s: [0.5, 0.06, 2.4] })
    }
    const r = rand(1000 + index * 97)
    const bodies: Xform[] = []
    const heads: Xform[] = []
    for (let i = 0; i < 46; i++) {
      const near = r() < 0.65
      const z = near ? DOOR_CENTERS[Math.floor(r() * DOOR_CENTERS.length)] + (r() - 0.5) * 3 : r() * TRAIN_LEN
      const x = near ? -2.5 - r() * 1.6 : -3.5 - r() * 7.5
      const hScale = 0.86 + r() * 0.24
      const bodyH = 1.35 * hScale
      const y = PLATFORM_Y + bodyH / 2
      bodies.push({ p: [x, y, z], s: [1 + (r() - 0.5) * 0.25, hScale, 1], r: [0, r() * Math.PI, 0], c: CLOTHES[Math.floor(r() * CLOTHES.length)] })
      heads.push({ p: [x, PLATFORM_Y + bodyH + 0.13, z], c: SKIN[Math.floor(r() * SKIN.length)] })
    }
    const adSlots: { z: number; i: number }[] = []
    const names: number[] = []
    let k = 0
    for (let z = 12; z < TRAIN_LEN - 4; z += 26) {
      if (k % 2 === 0) names.push(z)
      else adSlots.push({ z, i: (k + index) % AD_URLS.length })
      k++
    }
    return { panels, mullions, lamps, trackLights, platLights, pillars, benches, bodies, heads, adSlots, names }
  }, [zFront, zBack, index])

  const leafCount = DOOR_CENTERS.length * 2
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(() => {
    const s = stateRef.current
    const g = group.current
    if (!s || !g) return
    g.visible = Math.abs(s.pos - st.pos) < 700
    if (!g.visible) return

    const isTarget = STATIONS[s.target] === st
    const open = isTarget ? (doorRef.current ?? 0) : 0
    const mesh = leaves.current
    if (mesh && open !== lastDoor.current) {
      lastDoor.current = open
      DOOR_CENTERS.forEach((c, i) => {
        for (let k = 0; k < 2; k++) {
          const dir = k === 0 ? -1 : 1
          dummy.position.set(PSD_X - 0.06, PLATFORM_Y + PSD_H / 2 - 0.03, c + dir * (0.51 + open * 0.98))
          dummy.rotation.set(0, Math.PI / 2, 0)
          dummy.scale.set(1.02, PSD_H - 0.08, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(i * 2 + k, dummy.matrix)
        }
      })
      mesh.instanceMatrix.needsUpdate = true
    }

    const isCurrent = STATIONS[s.target - 1] === st
    const green = isCurrent && !s.doorsOpen && (s.phase === 'ready' || s.phase === 'running')
    if (redLamp.current) redLamp.current.emissiveIntensity = green ? 0.05 : 6
    if (greenLamp.current) greenLamp.current.emissiveIntensity = green ? 6 : 0.05
  })

  return (
    <group ref={group} position={[0, 0, -st.pos]}>
      <mesh geometry={planeGeo} material={m.trackWall} position={[TRACK_WALL_X, STATION_CEIL / 2 - 0.2, zMid]} rotation={ROT_FACE_NEG_X} scale={[len, STATION_CEIL + 0.4, 1]} />
      <mesh geometry={planeGeo} material={m.dado} position={[TRACK_WALL_X - 0.01, 0.4, zMid]} rotation={ROT_FACE_NEG_X} scale={[len, 1.2, 1]} />
      <mesh geometry={planeGeo} material={m.ceilTrack} position={[(PSD_X + TRACK_WALL_X) / 2, STATION_CEIL, zMid]} rotation={[Math.PI / 2, 0, 0]} scale={[TRACK_WALL_X - PSD_X, len, 1]} />
      <mesh geometry={planeGeo} material={m.pitFloor} position={[(PLATFORM_EDGE_X + TRACK_WALL_X) / 2, -0.19, zMid]} rotation={[-Math.PI / 2, 0, 0]} scale={[TRACK_WALL_X - PLATFORM_EDGE_X, len, 1]} />

      <mesh geometry={planeGeo} material={m.edgeFace} position={[PLATFORM_EDGE_X, (PLATFORM_Y - 0.2) / 2, psdMid]} rotation={ROT_FACE_POS_X} scale={[psdLen, PLATFORM_Y + 0.2, 1]} />
      <mesh geometry={planeGeo} material={m.floor} position={[(PLATFORM_EDGE_X + PSD_X) / 2, PLATFORM_Y, psdMid]} rotation={[-Math.PI / 2, 0, 0]} scale={[PLATFORM_EDGE_X - PSD_X, psdLen, 1]} />
      <mesh geometry={boxGeo} material={m.tactile} position={[PLATFORM_EDGE_X - 0.05, PLATFORM_Y + 0.004, psdMid]} scale={[0.06, 0.01, psdLen]} />

      <mesh geometry={planeGeo} material={m.trackWall} position={[PSD_X, STATION_CEIL / 2 - 0.2, (zFront + PSD_START) / 2]} rotation={ROT_FACE_POS_X} scale={[PSD_START - zFront, STATION_CEIL + 0.4, 1]} />
      <mesh geometry={planeGeo} material={m.trackWall} position={[PSD_X, STATION_CEIL / 2 - 0.2, (PSD_END + zBack) / 2]} rotation={ROT_FACE_POS_X} scale={[zBack - PSD_END, STATION_CEIL + 0.4, 1]} />
      <mesh geometry={planeGeo} material={m.endWallTile} position={[PSD_X + 0.01, (PSD_TOP + 0.85 + STATION_CEIL) / 2, psdMid]} rotation={ROT_FACE_POS_X} scale={[psdLen, STATION_CEIL - PSD_TOP - 0.85, 1]} />

      <mesh geometry={geo.endWall} material={m.endWallTile} position={[0, 0, zFront]} />
      <mesh geometry={geo.endWall} material={m.endWallTile} position={[0, 0, zBack]} />

      <StaticInstances geometry={boxGeo} material={m.glass} items={items.panels} />
      <StaticInstances geometry={boxGeo} material={m.steel} items={items.mullions} />
      <instancedMesh ref={leaves} args={[planeGeo, m.leaf, leafCount]} frustumCulled={false} />
      <mesh geometry={boxGeo} material={m.steel} position={[PSD_X + 0.04, PLATFORM_Y + 0.04, psdMid]} scale={[0.22, 0.08, psdLen]} />
      <mesh geometry={boxGeo} material={m.darkMetal} position={[PSD_X + 0.12, PSD_TOP + 0.42, psdMid]} scale={[0.32, 0.85, psdLen]} />
      <StaticInstances geometry={geo.lamp} material={m.doorLamp} items={items.lamps} />
      {text && (
        <mesh geometry={planeGeo} material={text.header} position={[PSD_X + 0.285, PSD_TOP + 0.52, psdMid]} rotation={ROT_FACE_POS_X} scale={[psdLen, 0.4, 1]} />
      )}

      <StaticInstances geometry={boxGeo} material={m.lightStrip} items={items.trackLights} />
      {text &&
        items.names.map((z) => (
          <group key={`n${z}`} position={[TRACK_WALL_X - 0.03, 3.2, z]} rotation={ROT_FACE_NEG_X}>
            <mesh geometry={planeGeo} material={text.name} scale={[8, 2, 1]} />
          </group>
        ))}
      {items.adSlots.map(({ z, i }) => (
        <group key={`a${z}`} position={[TRACK_WALL_X - 0.06, 2.55, z]} rotation={ROT_FACE_NEG_X}>
          <mesh geometry={boxGeo} material={m.darkMetal} position={[0, 0, -0.04]} scale={[3.9, 2.7, 0.08]} />
          <mesh geometry={planeGeo} material={m.adMats[i]} position={[0, 0, 0.005]} scale={[3.6, 2.4, 1]} />
        </group>
      ))}

      <mesh geometry={planeGeo} material={m.floor} position={[(PLATFORM_FAR_X + PSD_X) / 2, PLATFORM_Y, zMid]} rotation={[-Math.PI / 2, 0, 0]} scale={[PSD_X - PLATFORM_FAR_X, len, 1]} />
      <mesh geometry={boxGeo} material={m.tactile} position={[PSD_X - 0.75, PLATFORM_Y + 0.004, psdMid]} scale={[0.3, 0.01, psdLen]} />
      <mesh geometry={planeGeo} material={m.ceilPlat} position={[(PLATFORM_FAR_X + PSD_X) / 2, PLATFORM_CEIL, zMid]} rotation={[Math.PI / 2, 0, 0]} scale={[PSD_X - PLATFORM_FAR_X, len, 1]} />
      <mesh geometry={planeGeo} material={m.farWall} position={[PLATFORM_FAR_X, PLATFORM_CEIL / 2, zMid]} rotation={ROT_FACE_POS_X} scale={[len, PLATFORM_CEIL, 1]} />
      <StaticInstances geometry={boxGeo} material={m.lightStrip} items={items.platLights} />
      <StaticInstances geometry={geo.pillar} material={m.pillar} items={items.pillars} />
      <StaticInstances geometry={boxGeo} material={m.steel} items={items.benches} />
      <StaticInstances geometry={geo.body} material={m.people} items={items.bodies} />
      <StaticInstances geometry={geo.head} material={m.people} items={items.heads} />

      {text && (
        <group position={[PSD_X + 0.32, 2.55, -0.6]}>
          <mesh geometry={boxGeo} material={m.darkMetal} scale={[0.34, 0.44, 0.03]} />
          <mesh geometry={planeGeo} material={text.stop} position={[0, 0, 0.017]} scale={[0.3, 0.38, 1]} />
          <mesh geometry={boxGeo} material={m.darkMetal} position={[0, 0.6, 0]} scale={[0.04, 0.8, 0.04]} />
        </group>
      )}

      <group position={[TRACK_WALL_X - 0.3, 3.2, -22]}>
        <mesh geometry={boxGeo} material={m.darkMetal} scale={[0.34, 0.8, 0.26]} />
        <mesh geometry={boxGeo} material={m.darkMetal} position={[0.1, -0.7, 0]} scale={[0.06, 0.7, 0.06]} />
        <mesh position={[0, 0.17, 0.135]}>
          <circleGeometry args={[0.09, 24]} />
          <meshStandardMaterial ref={redLamp} color="#200" emissive="#ff2a1a" emissiveIntensity={6} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.17, 0.135]}>
          <circleGeometry args={[0.09, 24]} />
          <meshStandardMaterial ref={greenLamp} color="#020" emissive="#2dff7a" emissiveIntensity={0.05} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
