import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  Color,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector4
} from 'three';
import { useSession } from '../../store';
import { EARTH_RADIUS_M, ISS_ALTITUDE_M } from '../../sim/earth';

const RAD = Math.PI / 180;
// 亚卫星点：佛罗里达 / 卡纳维拉尔角肯尼迪航天中心正下方 (28.5°N, 80.6°W)
// PMA-2 对接口朝向为空间站飞行前方（+z），下方俯瞰北美大陆与大西洋蔚蓝海岸
export const SUB_LAT = 28.5 * RAD;
export const SUB_LON = -80.6 * RAD;
export const EARTH_ROTATION: [number, number, number] = [
  -(Math.PI / 2 - SUB_LAT),
  Math.PI / 2 - (SUB_LON + Math.PI),
  0
];

// 局部超清贴片在全景展开图中的 UV 范围 [uMin, vMin, uMax, vMax]
// 覆盖空间站下方视野内 4500 km 的北美大陆、墨西哥湾、佛罗里达与大西洋
export const DETAIL_BOUNDS = new Vector4(
  1420 / 8192,
  (4096 - 1923) / 4096,
  3104 / 8192,
  (4096 - 876) / 4096
);

// 运行在 GPU 上的分形微观地貌与纹理细节合成器
const NOISE_GLSL = /* glsl */ `
  float earthHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float earthNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(earthHash(i + vec3(0,0,0)), earthHash(i + vec3(1,0,0)), f.x),
          mix(earthHash(i + vec3(0,1,0)), earthHash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(earthHash(i + vec3(0,0,1)), earthHash(i + vec3(1,0,1)), f.x),
          mix(earthHash(i + vec3(0,1,1)), earthHash(i + vec3(1,1,1)), f.x), f.y), f.z
    );
  }

  // 3 阶多尺度分形噪声（生成山脉脊线、峡谷起伏与地表植被微纹理）
  float earthFbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * earthNoise(p);
      p *= 2.4;
      a *= 0.45;
    }
    return v;
  }
`;

/**
 * 科学级 1:1 高清地球系统
 * 融合 NASA 高清卫星底图（桌面 8K / 移动 4K）、程序化分形地貌微细节、
 * 4K 独立动态云层（带真实地表软阴影）与大气瑞利散射地平线辉光。
 */
export function Earth() {
  const quality = useSession((s) => s.quality);

  const dayTexturePath =
    quality === 'low' ? '/textures/earth_day_4096.jpg' : '/textures/earth_day_8192.jpg';

  const [dayMap, specularMap, cloudsMap, patchMap] = useTexture([
    dayTexturePath,
    '/textures/earth_specular.jpg',
    '/textures/earth_clouds_4096.jpg',
    '/textures/earth_patch_4096.jpg'
  ]);

  dayMap.colorSpace = SRGBColorSpace;
  dayMap.anisotropy = 8;
  patchMap.colorSpace = SRGBColorSpace;
  patchMap.anisotropy = 8;
  specularMap.anisotropy = 4;
  cloudsMap.colorSpace = SRGBColorSpace;
  cloudsMap.anisotropy = 4;

  const cloudsRef = useRef<Mesh>(null);

  // 1. 地表材质：真实卫星色彩 + 局部 4K AI 超分辨率增强 + 陆地公里级分形微地貌 + 海面太阳耀斑 (Sun Glint) + 云层投影 + 地平线瑞利散射
  const surfaceMaterial = useMemo(() => {
    const mat = new MeshStandardMaterial({
      map: dayMap,
      roughness: 0.85,
      metalness: 0.04,
      emissive: new Color('#040a12'),
      emissiveIntensity: 0.08
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSpecularMap = { value: specularMap };
      shader.uniforms.uCloudsMap = { value: cloudsMap };
      shader.uniforms.uDetailMap = { value: patchMap };
      shader.uniforms.uDetailBounds = { value: DETAIL_BOUNDS };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        varying vec3 vSpherePos;
        varying vec3 vWorldNormalVec;
        varying vec3 vWorldPosVec;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vSpherePos = normalize(position);
        vWorldNormalVec = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPosVec = (modelMatrix * vec4(position, 1.0)).xyz;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform sampler2D uSpecularMap;
        uniform sampler2D uCloudsMap;
        uniform sampler2D uDetailMap;
        uniform vec4 uDetailBounds;
        varying vec3 vSpherePos;
        varying vec3 vWorldNormalVec;
        varying vec3 vWorldPosVec;
        ${NOISE_GLSL}
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        /* glsl */ `
        #include <map_fragment>

        // 方案二：局部超清贴片 (4K AI 超分辨率地表增强层，覆盖空间站下方 4500 km 视野)
        vec2 detailUv = (vMapUv - uDetailBounds.xy) / (uDetailBounds.zw - uDetailBounds.xy);
        float inBounds = step(0.0, detailUv.x) * step(detailUv.x, 1.0) * step(0.0, detailUv.y) * step(detailUv.y, 1.0);
        float edgeAlpha = smoothstep(0.0, 0.06, detailUv.x) * smoothstep(1.0, 0.94, detailUv.x)
                        * smoothstep(0.0, 0.06, detailUv.y) * smoothstep(1.0, 0.94, detailUv.y) * inBounds;
        vec3 detailColor = texture2D(uDetailMap, clamp(detailUv, 0.0, 1.0)).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, detailColor, edgeAlpha);
        
        // 采样海洋/陆地水体遮罩（白=海洋 1.0，黑=陆地 0.0）
        float isWater = texture2D(uSpecularMap, vMapUv).r;
        
        // 1. 陆地微观地貌增强（在 420km 近轨视野下消除像素拉伸模糊，带来清晰的山峦地貌微质感）
        float landRelief = earthFbm(vSpherePos * 3600.0);
        float microDetail = earthNoise(vSpherePos * 9800.0);
        float landContrast = 0.88 + 0.20 * landRelief + 0.06 * microDetail;
        vec3 landColor = diffuseColor.rgb * landContrast;

        // 2. 海洋：保留真实 NASA 摄影的深蓝海面与巴哈马/佛罗里达浅滩礁绿松石色
        float oceanWaves = earthNoise(vSpherePos * 12000.0) * 0.04;
        vec3 oceanColor = diffuseColor.rgb * (0.96 + oceanWaves);

        // 依据遮罩平滑融合陆地与海洋基底色彩
        diffuseColor.rgb = mix(landColor, oceanColor, smoothstep(0.25, 0.75, isWater));

        // 3. 云层向地面的真实软阴影（根据阳光照射方向投影，赋予空间高度立体层次感）
        vec2 shadowOffset = vec2(0.0015, -0.0010);
        float cloudShadow = texture2D(uCloudsMap, vMapUv + shadowOffset).r;
        diffuseColor.rgb *= mix(1.0, 0.62, smoothstep(0.18, 0.75, cloudShadow) * 0.72);

        // 4. 大气瑞利散射地平线辉光：视线在掠射角边缘穿透的大气层更厚，呈现真实的幽蓝地平线
        vec3 viewDir = normalize(cameraPosition - vWorldPosVec);
        float cosTheta = dot(vWorldNormalVec, viewDir);
        float atmosphereHaze = pow(1.0 - clamp(cosTheta, 0.0, 1.0), 3.6);
        vec3 atmosphereColor = vec3(0.24, 0.56, 0.96);
        diffuseColor.rgb = mix(diffuseColor.rgb, atmosphereColor, atmosphereHaze * 0.55);
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        #include <roughnessmap_fragment>
        // 海洋平滑产生真实的太阳耀斑高光镜面反射 (Sun Glint)，陆地保持亚光粗糙度
        roughnessFactor = mix(0.86, 0.18, smoothstep(0.25, 0.75, isWater));
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <metalnessmap_fragment>',
        /* glsl */ `
        #include <metalnessmap_fragment>
        metalnessFactor = mix(0.02, 0.05, smoothstep(0.25, 0.75, isWater));
        `
      );
    };

    return mat;
  }, [dayMap, specularMap, cloudsMap, patchMap]);

  // 2. 独立云层材质：4K NASA 真实云图 + 分形卷云絮结构 + 柔和边缘羽化 + 大气散射边缘
  const cloudsMaterial = useMemo(() => {
    const mat = new MeshStandardMaterial({
      map: cloudsMap,
      transparent: true,
      roughness: 0.95,
      metalness: 0.0,
      depthWrite: false
    });

    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        varying vec3 vSpherePos;
        varying vec3 vWorldNormalVec;
        varying vec3 vWorldPosVec;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vSpherePos = normalize(position);
        vWorldNormalVec = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPosVec = (modelMatrix * vec4(position, 1.0)).xyz;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        varying vec3 vSpherePos;
        varying vec3 vWorldNormalVec;
        varying vec3 vWorldPosVec;
        ${NOISE_GLSL}
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        /* glsl */ `
        #include <map_fragment>
        float rawCloud = diffuseColor.r;
        
        // 分形扰动云层边缘，使云絮呈现丝缕状自然消散效果
        float wisps = earthFbm(vSpherePos * 3200.0);
        float micro = earthNoise(vSpherePos * 8000.0);
        
        // 羽化边缘：让厚云层立体丰满，薄云层轻柔透出下方地面
        float cloudAlpha = smoothstep(0.10, 0.75, rawCloud * (0.86 + 0.28 * wisps));
        
        vec3 viewDir = normalize(cameraPosition - vWorldPosVec);
        float cosTheta = dot(vWorldNormalVec, viewDir);
        float haze = pow(1.0 - clamp(cosTheta, 0.0, 1.0), 3.6);

        vec3 baseCloudColor = vec3(0.96, 0.98, 1.0) * (0.92 + 0.10 * micro);
        diffuseColor.rgb = mix(baseCloudColor, vec3(0.35, 0.68, 1.0), haze * 0.40);
        diffuseColor.a = cloudAlpha * 0.85;
        `
      );
    };

    return mat;
  }, [cloudsMap]);

  // 模拟空间站近地轨道高空气流缓慢飘移
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.00016;
    }
  });

  return (
    <group position={[0, -(EARTH_RADIUS_M + ISS_ALTITUDE_M), 0]} rotation={EARTH_ROTATION}>
      {/* 1. 地球陆地与海洋实体球体 (平均半径 6,371 km) */}
      <mesh material={surfaceMaterial}>
        <sphereGeometry args={[EARTH_RADIUS_M, 256, 128]} />
      </mesh>

      {/* 2. 独立对流层云层系统 (距地表约 12 km，真实比例) */}
      <mesh ref={cloudsRef} material={cloudsMaterial}>
        <sphereGeometry args={[EARTH_RADIUS_M + 12_000, 256, 128]} />
      </mesh>
    </group>
  );
}
