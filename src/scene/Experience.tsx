import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useControls } from 'leva'
import { useSceneStore } from '../store'
import { SkyDome } from './SkyDome'
import { Ground } from './Ground'
import { Pond } from './Pond'
import { SakuraTree } from './SakuraTree'
import { Bushes } from './Bushes'
import { Forest } from './Forest'
import { FallingParticles } from './FallingParticles'
import { TREES } from '../utils/treeLayout'
import { POND_CENTER } from '../utils/pondShape'

const ORBIT_TARGET: [number, number, number] = [POND_CENTER[0], 1.2, POND_CENTER[1]]

export function Experience() {
  const autoRotate = useSceneStore((s) => s.autoRotate)

  const controlsRef = useRef<OrbitControlsImpl>(null)
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera
  const view = useRef({ azimuth: 142, polar: 83, distance: 13 })
  const lastSync = useRef(0)

  // Move the camera around the orbit target to the given spherical angles.
  const applyView = () => {
    const controls = controlsRef.current
    if (!controls) return
    const { azimuth, polar, distance } = view.current
    const az = THREE.MathUtils.degToRad(azimuth)
    const po = THREE.MathUtils.degToRad(polar)
    camera.position.set(
      controls.target.x + distance * Math.sin(po) * Math.sin(az),
      controls.target.y + distance * Math.cos(po),
      controls.target.z + distance * Math.sin(po) * Math.cos(az),
    )
    controls.update()
  }

  const [cam, setCam] = useControls('Camera', () => {
    // Only user edits in the panel move the camera; values pushed from the
    // camera (fromPanel === false) are ignored to avoid a feedback loop.
    const field = (key: 'azimuth' | 'polar' | 'distance', value: number, min: number, max: number, label: string) => ({
      value,
      min,
      max,
      step: 0.1,
      label,
      onChange: (v: number, _path: string, ctx: { fromPanel: boolean }) => {
        view.current[key] = v
        if (ctx.fromPanel) applyView()
      },
    })
    return {
      fov: { value: 45, min: 10, max: 120, step: 1 },
      azimuth: field('azimuth', 135, -180, 180, 'azimuth°'),
      polar: field('polar', 83, 1, 89, 'polar° (0 = top)'),
      distance: field('distance', 8.6, 1, 40, 'distance'),
      rotateSpeed: { value: 0.6, min: 0, max: 5, step: 0.05, label: 'auto-rotate speed' },
      damping: { value: true },
      minDistance: { value: 3.5, min: 0.5, max: 20, step: 0.1 },
      maxDistance: { value: 16, min: 5, max: 60, step: 0.5 },
      maxPolar: { value: 88.3, min: 45, max: 120, step: 0.5, label: 'max polar°' },
    }
  }, { collapsed: true })

  useEffect(() => {
    camera.fov = cam.fov
    camera.updateProjectionMatrix()
  }, [camera, cam.fov])

  // Reflect orbit-drag / zoom back into the sliders (throttled).
  useFrame(({ clock }) => {
    const controls = controlsRef.current
    if (!controls || clock.elapsedTime - lastSync.current < 0.15) return
    lastSync.current = clock.elapsedTime
    const offset = camera.position.clone().sub(controls.target)
    const distance = offset.length()
    const polar = THREE.MathUtils.radToDeg(Math.acos(offset.y / distance))
    const azimuth = THREE.MathUtils.radToDeg(Math.atan2(offset.x, offset.z))
    const cur = view.current
    if (Math.abs(cur.azimuth - azimuth) + Math.abs(cur.polar - polar) + Math.abs(cur.distance - distance) < 0.05) return
    view.current = { azimuth, polar, distance }
    setCam({ azimuth, polar, distance })
  })

  return (
    <>
      <SkyDome />
      <Ground />
      <Pond />
      {TREES.map((tree) => (
        <SakuraTree key={tree.seed} {...tree} />
      ))}
      <Bushes />
      <Forest />
      <FallingParticles />

      <OrbitControls
        ref={controlsRef}
        target={ORBIT_TARGET}
        minDistance={cam.minDistance}
        maxDistance={cam.maxDistance}
        maxPolarAngle={THREE.MathUtils.degToRad(cam.maxPolar)}
        autoRotate={autoRotate}
        autoRotateSpeed={cam.rotateSpeed}
        enableDamping={cam.damping}
      />
    </>
  )
}
