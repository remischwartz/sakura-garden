// Minimal planar reflector, adapted from three.js's official
// examples/jsm/objects/Reflector.js but trimmed down (no MSAA, no
// HalfFloat, no log-depth chunks) for a stylized low-poly scene.
import * as THREE from 'three'

export interface ReflectorOptions {
  textureWidth?: number
  textureHeight?: number
  clipBias?: number
  color?: THREE.ColorRepresentation
}

const reflectorVertexShader = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vUv;
  void main() {
    vUv = textureMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`

const reflectorFragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float reflectivity;
  uniform float distortion;
  uniform float ripples;
  uniform float time;
  uniform float blur;
  uniform vec2 texel;
  uniform sampler2D tDiffuse;
  varying vec4 vUv;
  float blendOverlayChannel( float base, float blend ) {
    return base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) );
  }
  vec3 blendOverlay( vec3 base, vec3 blend ) {
    return vec3(
      blendOverlayChannel( base.r, blend.r ),
      blendOverlayChannel( base.g, blend.g ),
      blendOverlayChannel( base.b, blend.b )
    );
  }
  void main() {
    vec2 uv = vUv.xy / vUv.w;
    uv += distortion * vec2(
      sin( uv.y * ripples + time ) + sin( uv.y * ripples * 2.3 - time * 1.3 ),
      cos( uv.x * ripples + time * 0.8 ) + cos( uv.x * ripples * 1.7 + time )
    );
    // Golden-angle spiral blur: softens the aliased edges of the reflection.
    vec3 acc = texture2D( tDiffuse, uv ).rgb;
    float total = 1.0;
    for ( int i = 1; i < 16; i ++ ) {
      float fi = float( i );
      float a = fi * 2.399963;
      float r = sqrt( fi / 16.0 ) * blur;
      acc += texture2D( tDiffuse, uv + vec2( cos( a ), sin( a ) ) * r * texel ).rgb;
      total += 1.0;
    }
    vec4 base = vec4( acc / total, 1.0 );
    gl_FragColor = vec4( mix( color, blendOverlay( base.rgb, color ), reflectivity ), 1.0 );
  }
`

export class SimpleReflector extends THREE.Mesh {
  getRenderTarget: () => THREE.WebGLRenderTarget

  constructor(geometry: THREE.BufferGeometry, options: ReflectorOptions = {}) {
    super(geometry)

    const textureWidth = options.textureWidth || 512
    const textureHeight = options.textureHeight || 512
    const clipBias = options.clipBias || 0
    const color = new THREE.Color(options.color !== undefined ? options.color : 0x808080)

    const reflectorPlane = new THREE.Plane()
    const normal = new THREE.Vector3()
    const reflectorWorldPosition = new THREE.Vector3()
    const cameraWorldPosition = new THREE.Vector3()
    const rotationMatrix = new THREE.Matrix4()
    const lookAtPosition = new THREE.Vector3(0, 0, -1)
    const clipPlane = new THREE.Vector4()
    const view = new THREE.Vector3()
    const target = new THREE.Vector3()
    const q = new THREE.Vector4()
    const textureMatrix = new THREE.Matrix4()
    const virtualCamera = new THREE.PerspectiveCamera()

    const renderTarget = new THREE.WebGLRenderTarget(textureWidth, textureHeight)
    renderTarget.texture.colorSpace = THREE.SRGBColorSpace

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: color },
        reflectivity: { value: 1 },
        distortion: { value: 0 },
        ripples: { value: 60 },
        time: { value: 0 },
        blur: { value: 0 },
        texel: { value: new THREE.Vector2(1 / textureWidth, 1 / textureHeight) },
        tDiffuse: { value: renderTarget.texture },
        textureMatrix: { value: textureMatrix },
      },
      fragmentShader: reflectorFragmentShader,
      vertexShader: reflectorVertexShader,
    })
    material.toneMapped = false

    this.material = material
    this.getRenderTarget = () => renderTarget

    this.onBeforeRender = (renderer, scene, camera) => {
      reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld)
      cameraWorldPosition.setFromMatrixPosition((camera as THREE.Camera).matrixWorld)

      rotationMatrix.extractRotation(this.matrixWorld)

      normal.set(0, 0, 1)
      normal.applyMatrix4(rotationMatrix)

      view.subVectors(reflectorWorldPosition, cameraWorldPosition)
      if (view.dot(normal) > 0) return

      view.reflect(normal).negate()
      view.add(reflectorWorldPosition)

      rotationMatrix.extractRotation((camera as THREE.PerspectiveCamera).matrixWorld)

      lookAtPosition.set(0, 0, -1)
      lookAtPosition.applyMatrix4(rotationMatrix)
      lookAtPosition.add(cameraWorldPosition)

      target.subVectors(reflectorWorldPosition, lookAtPosition)
      target.reflect(normal).negate()
      target.add(reflectorWorldPosition)

      virtualCamera.position.copy(view)
      virtualCamera.up.set(0, 1, 0)
      virtualCamera.up.applyMatrix4(rotationMatrix)
      virtualCamera.up.reflect(normal)
      virtualCamera.lookAt(target)
      virtualCamera.far = (camera as THREE.PerspectiveCamera).far
      virtualCamera.updateMatrixWorld()
      virtualCamera.projectionMatrix.copy((camera as THREE.PerspectiveCamera).projectionMatrix)

      textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0)
      textureMatrix.multiply(virtualCamera.projectionMatrix)
      textureMatrix.multiply(virtualCamera.matrixWorldInverse)
      textureMatrix.multiply(this.matrixWorld)

      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition)
      reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse)
      clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant)

      const projectionMatrix = virtualCamera.projectionMatrix
      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0]
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5]
      q.z = -1.0
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]

      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q))
      projectionMatrix.elements[2] = clipPlane.x
      projectionMatrix.elements[6] = clipPlane.y
      projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias
      projectionMatrix.elements[14] = clipPlane.w

      this.visible = false

      const currentRenderTarget = renderer.getRenderTarget()
      const currentXrEnabled = renderer.xr.enabled
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate

      renderer.xr.enabled = false
      renderer.shadowMap.autoUpdate = false
      renderer.setRenderTarget(renderTarget)
      renderer.state.buffers.depth.setMask(true)
      if (!renderer.autoClear) renderer.clear()
      renderer.render(scene, virtualCamera)

      renderer.xr.enabled = currentXrEnabled
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate
      renderer.setRenderTarget(currentRenderTarget)

      this.visible = true
    }
  }
}
