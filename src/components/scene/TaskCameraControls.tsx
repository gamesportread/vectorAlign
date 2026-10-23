import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Camera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  TASK_CAMERA_BASE_CONFIG,
  TASK_CAMERA_MOUSE_BUTTONS,
  TASK_CAMERA_TOUCHES,
  stepFollowTargetWithPan
} from './taskCameraConfig';

export interface TaskCameraControlsProps {
  /** 初始或视角预设切换时的相机观察中心点 */
  initialTarget?: [number, number, number];
  /** 初始或视角预设切换时的相机位置（可选，不传则沿用 Canvas 初始相机位置） */
  initialPosition?: [number, number, number];
  /** 当该 key 变化时重置相机位置、观察中心点及平移偏移（如切换视角预设或切换关卡） */
  resetKey?: string | number;
  /** 动态跟随目标回调（可选，在保留用户右键平移偏移的前提下平滑跟随运动目标） */
  followTarget?: () => [number, number, number];
  /** 动态跟随平滑插值系数，默认 0.05 */
  followLerp?: number;
  /** 最近滚轮缩放距离 */
  minDistance?: number;
  /** 最远滚轮缩放距离 */
  maxDistance?: number;
  /** 最小俯仰极角 */
  minPolarAngle?: number;
  /** 最大俯仰极角 */
  maxPolarAngle?: number;
  /** 是否启用鼠标控制器（如第一人称机头视角时可设为 false） */
  enabled?: boolean;
  /** 每帧附加回调（用于第一人称相机位姿同步或相机震动叠加） */
  onFrame?: (camera: Camera) => void;
}

/**
 * 所有具体 3D 任务场景共用的统一相机与鼠标交互组件：
 * - 左键拖拽：旋转视角 (MOUSE.ROTATE)
 * - 右键拖拽：平移视角 (MOUSE.PAN, screenSpacePanning)
 * - 滚轮滚动：缩放距离 (MOUSE.DOLLY)
 *
 * 注意：不向底层 <OrbitControls> 传递内联 target 数组属性，防止高频 React 重渲染覆盖用户的右键平移状态。
 */
export function TaskCameraControls({
  initialTarget = [0, 0, 0],
  initialPosition,
  resetKey = 'default',
  followTarget,
  followLerp = 0.05,
  minDistance = 2.5,
  maxDistance = 180,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI * 0.9,
  enabled = true,
  onFrame
}: TaskCameraControlsProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const lastResetKeyRef = useRef<string | number | null>(null);
  const smoothedAnchorRef = useRef<[number, number, number]>([...initialTarget]);
  const overrideRef = useRef<{
    pos: [number, number, number];
    target: [number, number, number];
  } | null>(null);

  useEffect(() => {
    const win = window as any;
    win.__setCamera = (
      x: number,
      y: number,
      z: number,
      tx = initialTarget[0],
      ty = initialTarget[1],
      tz = initialTarget[2]
    ) => {
      overrideRef.current = { pos: [x, y, z], target: [tx, ty, tz] };
      camera.position.set(x, y, z);
      camera.lookAt(tx, ty, tz);
      if (controlsRef.current) {
        controlsRef.current.target.set(tx, ty, tz);
        controlsRef.current.update();
      }
    };
    win.__resetCamera = () => {
      overrideRef.current = null;
      lastResetKeyRef.current = null;
    };
    win.__getCameraControlsState = () => ({
      enabled,
      enableRotate: controlsRef.current?.enableRotate ?? TASK_CAMERA_BASE_CONFIG.enableRotate,
      enablePan: controlsRef.current?.enablePan ?? TASK_CAMERA_BASE_CONFIG.enablePan,
      enableZoom: controlsRef.current?.enableZoom ?? TASK_CAMERA_BASE_CONFIG.enableZoom,
      screenSpacePanning:
        controlsRef.current?.screenSpacePanning ?? TASK_CAMERA_BASE_CONFIG.screenSpacePanning,
      mouseButtons: TASK_CAMERA_MOUSE_BUTTONS,
      position: [camera.position.x, camera.position.y, camera.position.z] as [
        number,
        number,
        number
      ],
      target: controlsRef.current
        ? ([
            controlsRef.current.target.x,
            controlsRef.current.target.y,
            controlsRef.current.target.z
          ] as [number, number, number])
        : [...initialTarget]
    });
    return () => {
      delete win.__setCamera;
      delete win.__resetCamera;
      delete win.__getCameraControlsState;
    };
  }, [camera, enabled, initialTarget]);

  useFrame(() => {
    if (overrideRef.current) {
      const { pos, target } = overrideRef.current;
      camera.position.set(...pos);
      camera.lookAt(...target);
      if (controlsRef.current) {
        controlsRef.current.target.set(...target);
      }
      return;
    }

    if (enabled) {
      if (lastResetKeyRef.current !== resetKey && controlsRef.current) {
        camera.up.set(0, 1, 0);
        if (initialPosition) {
          camera.position.set(...initialPosition);
        }
        const startAnchor = followTarget ? followTarget() : initialTarget;
        smoothedAnchorRef.current = [...startAnchor];
        controlsRef.current.target.set(...initialTarget);
        controlsRef.current.update();
        lastResetKeyRef.current = resetKey;
      } else if (followTarget && controlsRef.current) {
        const t = controlsRef.current.target;
        const { nextTarget, nextAnchor } = stepFollowTargetWithPan(
          [t.x, t.y, t.z],
          smoothedAnchorRef.current,
          followTarget(),
          followLerp
        );
        smoothedAnchorRef.current = nextAnchor;
        t.set(...nextTarget);
      }
    } else {
      lastResetKeyRef.current = null;
    }

    onFrame?.(camera);
  });

  if (!enabled) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      enableRotate={TASK_CAMERA_BASE_CONFIG.enableRotate}
      enablePan={TASK_CAMERA_BASE_CONFIG.enablePan}
      enableZoom={TASK_CAMERA_BASE_CONFIG.enableZoom}
      screenSpacePanning={TASK_CAMERA_BASE_CONFIG.screenSpacePanning}
      rotateSpeed={TASK_CAMERA_BASE_CONFIG.rotateSpeed}
      panSpeed={TASK_CAMERA_BASE_CONFIG.panSpeed}
      zoomSpeed={TASK_CAMERA_BASE_CONFIG.zoomSpeed}
      mouseButtons={TASK_CAMERA_MOUSE_BUTTONS}
      touches={TASK_CAMERA_TOUCHES}
    />
  );
}
