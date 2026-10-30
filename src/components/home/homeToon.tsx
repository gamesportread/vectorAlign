/**
 * 主页 360° 全景「三渲二」(Cel-Shading / Toon) 渲染工具集
 * - toonifyObject: 将 GLB 模型材质替换为分段色阶 MeshToonMaterial + 硬边轮廓光
 * - ToonInkPass:   基于深度 + 法线的屏幕空间描边后处理（漫画墨线）
 * - createSparkleTexture: 动漫风四芒星闪烁贴图
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CanvasTexture,
  Color,
  DataTexture,
  DepthTexture,
  HalfFloatType,
  Material,
  Mesh,
  MeshNormalMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  RedFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderTarget
} from 'three';

/** 参与描边的网格所在图层（描边法线通道只渲染该图层） */
export const INK_LAYER = 3;

/** 三段式色阶：暗部 / 中间调 / 亮部（硬边过渡，典型赛璐珞上色） */
export function createToonGradient(steps: number[] = [92, 182, 255]) {
  const data = new Uint8Array(steps);
  const tex = new DataTexture(data, steps.length, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export interface ToonifyOptions {
  gradientMap: DataTexture;
  /** 硬边轮廓光颜色 */
  rimColor?: string;
  rimStrength?: number;
  /** 色彩饱和度提升（1 = 原色） */
  saturation?: number;
  /** 整体明度倍率（用于偏灰暗的写实贴图） */
  brightness?: number;
  /** 贴图采样 mip 偏移：抹平写实贴图的细碎噪点，更接近平涂 */
  mapBias?: number;
  /** 按材质名称进行单独调整（如把烟雾改成奶白色赛璐珞云团） */
  overrides?: Record<string, (mat: MeshToonMaterial) => void>;
}

function toToonMaterial(src: Material, opts: ToonifyOptions): MeshToonMaterial {
  const s = src as MeshStandardMaterial;
  const color = s.color ? s.color.clone() : new Color('#ffffff');
  if (opts.saturation && opts.saturation !== 1) {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    color.setHSL(hsl.h, Math.min(1, hsl.s * opts.saturation), hsl.l);
  }
  if (opts.brightness && opts.brightness !== 1) color.multiplyScalar(opts.brightness);
  const toon = new MeshToonMaterial({
    name: `${src.name || 'mat'}-toon`,
    color,
    map: s.map ?? null,
    alphaMap: s.alphaMap ?? null,
    emissive: s.emissive ? s.emissive.clone() : new Color('#000000'),
    emissiveMap: s.emissiveMap ?? null,
    emissiveIntensity: s.emissiveIntensity ?? 1,
    gradientMap: opts.gradientMap,
    transparent: src.transparent,
    opacity: src.opacity,
    alphaTest: src.alphaTest,
    side: src.side,
    depthWrite: src.depthWrite,
    vertexColors: src.vertexColors
  });

  const rimColor = new Color(opts.rimColor ?? '#dff4ff');
  const rimStrength = opts.rimStrength ?? 0.4;
  const mapBias = opts.mapBias ?? 1.2;
  toon.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimColor };
    shader.uniforms.uRimStrength = { value: rimStrength };
    shader.uniforms.uMapBias = { value: mapBias };
    shader.fragmentShader =
      'uniform vec3 uRimColor;\nuniform float uRimStrength;\nuniform float uMapBias;\n' +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
        #ifdef USE_MAP
          diffuseColor *= texture2D( map, vMapUv, uMapBias );
        #endif`
        )
        .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        // 赛璐珞硬边轮廓光：掠射角处出现一条干净的亮边
        float toonRimDot = 1.0 - saturate(dot(normalize(vViewPosition), normal));
        float toonRim = smoothstep(0.66, 0.70, toonRimDot);
        outgoingLight += uRimColor * toonRim * uRimStrength;
        #include <opaque_fragment>`
      );
  };
  toon.customProgramCacheKey = () => 'home-toon-rim';
  opts.overrides?.[src.name]?.(toon);
  return toon;
}

/**
 * 将克隆后的模型替换为三渲二材质（不会影响其它场景共用的 GLTF 缓存材质），
 * 并把网格加入描边图层。
 */
export function toonifyObject(root: Object3D, opts: ToonifyOptions) {
  const cache = new Map<Material, MeshToonMaterial>();
  const convert = (m: Material) => {
    let t = cache.get(m);
    if (!t) {
      t = toToonMaterial(m, opts);
      cache.set(m, t);
    }
    return t;
  };
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.material = Array.isArray(obj.material) ? obj.material.map(convert) : convert(obj.material);
    obj.layers.enable(INK_LAYER);
  });
  return root;
}

/** 动漫风四芒星闪烁贴图（用于星场 Points） */
export function createSparkleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;
  // 柔和光晕
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, 'rgba(255,255,255,0.95)');
  glow.addColorStop(0.18, 'rgba(255,255,255,0.45)');
  glow.addColorStop(0.45, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  // 四芒星主体（硬边）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const arm = c * 0.98;
  const waist = c * 0.12;
  ctx.moveTo(c, c - arm);
  ctx.quadraticCurveTo(c + waist, c - waist, c + arm, c);
  ctx.quadraticCurveTo(c + waist, c + waist, c, c + arm);
  ctx.quadraticCurveTo(c - waist, c + waist, c - arm, c);
  ctx.quadraticCurveTo(c - waist, c - waist, c, c - arm);
  ctx.fill();
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

const INK_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const INK_FRAGMENT = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uThickness;
uniform vec3 uInkColor;
uniform float uInkOpacity;
varying vec2 vUv;

float viewDepth(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(d, uNear, uFar);
}

vec3 viewNormal(vec2 uv) {
  return texture2D(tNormal, uv).xyz * 2.0 - 1.0;
}

void main() {
  vec4 base = texture2D(tColor, vUv);
  vec2 o = uTexel * uThickness;

  float dc = viewDepth(vUv);
  vec3 nc = viewNormal(vUv);
  float covC = texture2D(tNormal, vUv).a;

  vec2 offs[8];
  offs[0] = vec2( o.x, 0.0); offs[1] = vec2(-o.x, 0.0);
  offs[2] = vec2(0.0,  o.y); offs[3] = vec2(0.0, -o.y);
  offs[4] = vec2( o.x,  o.y); offs[5] = vec2(-o.x,  o.y);
  offs[6] = vec2( o.x, -o.y); offs[7] = vec2(-o.x, -o.y);

  float depthEdge = 0.0;
  float normalEdge = 0.0;
  float covEdge = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 uv = vUv + offs[i];
    float dn = viewDepth(uv);
    float rel = abs(dn - dc) / max(min(dn, dc), 0.001);
    depthEdge = max(depthEdge, rel);
    vec4 nTex = texture2D(tNormal, uv);
    covEdge = max(covEdge, abs(nTex.a - covC));
    if (nTex.a > 0.5 && covC > 0.5) {
      normalEdge = max(normalEdge, 1.0 - dot(nc, nTex.xyz * 2.0 - 1.0));
    }
  }

  float edge = max(
    smoothstep(0.04, 0.1, depthEdge),
    smoothstep(0.45, 0.75, normalEdge)
  );
  edge = max(edge, smoothstep(0.3, 0.7, covEdge));

  vec3 col = mix(base.rgb, uInkColor, edge * uInkOpacity);
  gl_FragColor = vec4(col, max(base.a, edge * uInkOpacity));
  #include <colorspace_fragment>
}
`;

export interface ToonInkPassProps {
  inkColor?: string;
  thickness?: number;
  opacity?: number;
}

/**
 * 屏幕空间漫画描边后处理：
 * 1. 正常渲染彩色场景到 MSAA 渲染目标
 * 2. 仅渲染描边图层的视空间法线 + 深度
 * 3. 合成：Sobel 式邻域比较深度/法线突变 → 叠加墨线
 */
export function ToonInkPass({ inkColor = '#0a0f24', thickness = 1.25, opacity = 0.92 }: ToonInkPassProps) {
  const { gl, scene, camera, size } = useThree();

  const res = useMemo(() => {
    const colorTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    const normalTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    normalTarget.depthTexture = new DepthTexture(1, 1);
    const normalMaterial = new MeshNormalMaterial();
    const inkMaterial = new ShaderMaterial({
      uniforms: {
        tColor: { value: colorTarget.texture },
        tNormal: { value: normalTarget.texture },
        tDepth: { value: normalTarget.depthTexture },
        uTexel: { value: new Vector2(1, 1) },
        uNear: { value: 0.1 },
        uFar: { value: 1000 },
        uThickness: { value: thickness },
        uInkColor: { value: new Color(inkColor) },
        uInkOpacity: { value: opacity }
      },
      vertexShader: INK_VERTEX,
      fragmentShader: INK_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      transparent: true
    });
    const quadScene = new Scene();
    const quad = new Mesh(new PlaneGeometry(2, 2), inkMaterial);
    quad.frustumCulled = false;
    quadScene.add(quad);
    const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { colorTarget, normalTarget, normalMaterial, inkMaterial, quadScene, quadCamera, quad };
  }, []);

  useEffect(() => {
    res.inkMaterial.uniforms.uInkColor.value.set(inkColor);
    res.inkMaterial.uniforms.uThickness.value = thickness;
    res.inkMaterial.uniforms.uInkOpacity.value = opacity;
  }, [inkColor, thickness, opacity, res]);

  useEffect(() => {
    return () => {
      res.colorTarget.dispose();
      res.normalTarget.depthTexture?.dispose();
      res.normalTarget.dispose();
      res.normalMaterial.dispose();
      res.inkMaterial.dispose();
      res.quad.geometry.dispose();
    };
  }, [res]);

  const clearColor = useMemo(() => new Color(), []);

  useFrame(() => {
    const dpr = gl.getPixelRatio();
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    if (res.colorTarget.width !== w || res.colorTarget.height !== h) {
      res.colorTarget.setSize(w, h);
      res.normalTarget.setSize(w, h);
      res.inkMaterial.uniforms.uTexel.value.set(1 / w, 1 / h);
    }
    const cam = camera as typeof camera & { near: number; far: number };
    res.inkMaterial.uniforms.uNear.value = cam.near;
    res.inkMaterial.uniforms.uFar.value = cam.far;

    // 1) 彩色通道
    gl.setRenderTarget(res.colorTarget);
    gl.clear();
    gl.render(scene, camera);

    // 2) 法线 + 深度通道（只渲染参与描边的模型图层）
    const prevMask = camera.layers.mask;
    const prevOverride = scene.overrideMaterial;
    const prevAlpha = gl.getClearAlpha();
    gl.getClearColor(clearColor);
    camera.layers.set(INK_LAYER);
    scene.overrideMaterial = res.normalMaterial;
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(res.normalTarget);
    gl.clear();
    gl.render(scene, camera);
    scene.overrideMaterial = prevOverride;
    camera.layers.mask = prevMask;
    gl.setClearColor(clearColor, prevAlpha);

    // 3) 合成墨线到屏幕
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(res.quadScene, res.quadCamera);
  }, 1);

  return null;
}
