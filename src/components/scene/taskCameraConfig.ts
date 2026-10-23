import { MOUSE, TOUCH } from 'three';

/**
 * 所有 3D 任务场景共用的统一鼠标按键映射：
 * - 左键拖拽 (LEFT): 旋转视角 (MOUSE.ROTATE)
 * - 右键拖拽 (RIGHT): 平移视角 (MOUSE.PAN)
 * - 滚轮 / 中键 (MIDDLE): 缩放特写 (MOUSE.DOLLY)
 */
export const TASK_CAMERA_MOUSE_BUTTONS = {
  LEFT: MOUSE.ROTATE,
  MIDDLE: MOUSE.DOLLY,
  RIGHT: MOUSE.PAN
} as const;

/**
 * 触屏设备对应的统一手势映射：
 * - 单指滑动: 旋转视角 (TOUCH.ROTATE)
 * - 双指捏合/拖拽: 缩放与平移 (TOUCH.DOLLY_PAN)
 */
export const TASK_CAMERA_TOUCHES = {
  ONE: TOUCH.ROTATE,
  TWO: TOUCH.DOLLY_PAN
} as const;

/**
 * 所有 3D 任务场景共用的基础相机控制参数
 */
export const TASK_CAMERA_BASE_CONFIG = {
  enableRotate: true,
  enablePan: true,
  enableZoom: true,
  screenSpacePanning: true,
  rotateSpeed: 0.85,
  panSpeed: 0.85,
  zoomSpeed: 1.0,
  mouseButtons: TASK_CAMERA_MOUSE_BUTTONS,
  touches: TASK_CAMERA_TOUCHES
} as const;

/**
 * 面向青少年用户的统一 3D 视口鼠标操作提示文案
 */
export const TASK_CAMERA_HINT_TEXT = {
  zh: '左键旋转 · 右键平移 · 滚轮缩放',
  en: 'LEFT DRAG ROTATE · RIGHT DRAG PAN · SCROLL ZOOM'
} as const;

export interface FollowTargetStepResult {
  nextTarget: [number, number, number];
  nextAnchor: [number, number, number];
  delta: [number, number, number];
}

/**
 * 计算平滑跟随动态目标（如运动中的飞船）时的相机 target 增量更新。
 * 通过仅叠加跟随锚点的帧间位移增量 (delta)，既能平滑跟随运动目标，
 * 又能 100% 保留用户使用右键平移 (Right-Click Pan) 产生的视角偏移量，不会把用户的平移拉回原点。
 */
export function stepFollowTargetWithPan(
  currentTarget: readonly [number, number, number],
  smoothedAnchor: readonly [number, number, number],
  rawFollowPoint: readonly [number, number, number],
  lerpFactor = 0.05
): FollowTargetStepResult {
  const t = Math.max(0, Math.min(1, lerpFactor));
  const nextAnchor: [number, number, number] = [
    smoothedAnchor[0] + (rawFollowPoint[0] - smoothedAnchor[0]) * t,
    smoothedAnchor[1] + (rawFollowPoint[1] - smoothedAnchor[1]) * t,
    smoothedAnchor[2] + (rawFollowPoint[2] - smoothedAnchor[2]) * t
  ];

  const delta: [number, number, number] = [
    nextAnchor[0] - smoothedAnchor[0],
    nextAnchor[1] - smoothedAnchor[1],
    nextAnchor[2] - smoothedAnchor[2]
  ];

  const nextTarget: [number, number, number] = [
    currentTarget[0] + delta[0],
    currentTarget[1] + delta[1],
    currentTarget[2] + delta[2]
  ];

  return { nextTarget, nextAnchor, delta };
}
