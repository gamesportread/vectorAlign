import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOUSE, TOUCH } from 'three';
import {
  TASK_CAMERA_BASE_CONFIG,
  TASK_CAMERA_HINT_TEXT,
  TASK_CAMERA_MOUSE_BUTTONS,
  TASK_CAMERA_TOUCHES,
  stepFollowTargetWithPan
} from './taskCameraConfig';

describe('Shared 3D Task Camera Controls Config & Logic', () => {
  it('enforces unified mouse buttons: Left Rotate, Right Pan, Wheel/Middle Zoom', () => {
    expect(TASK_CAMERA_MOUSE_BUTTONS.LEFT).toBe(MOUSE.ROTATE);
    expect(TASK_CAMERA_MOUSE_BUTTONS.RIGHT).toBe(MOUSE.PAN);
    expect(TASK_CAMERA_MOUSE_BUTTONS.MIDDLE).toBe(MOUSE.DOLLY);

    expect(TASK_CAMERA_TOUCHES.ONE).toBe(TOUCH.ROTATE);
    expect(TASK_CAMERA_TOUCHES.TWO).toBe(TOUCH.DOLLY_PAN);

    expect(TASK_CAMERA_BASE_CONFIG.enableRotate).toBe(true);
    expect(TASK_CAMERA_BASE_CONFIG.enablePan).toBe(true);
    expect(TASK_CAMERA_BASE_CONFIG.enableZoom).toBe(true);
    expect(TASK_CAMERA_BASE_CONFIG.screenSpacePanning).toBe(true);

    expect(TASK_CAMERA_HINT_TEXT.zh).toContain('左键旋转');
    expect(TASK_CAMERA_HINT_TEXT.zh).toContain('右键平移');
    expect(TASK_CAMERA_HINT_TEXT.zh).toContain('滚轮缩放');
  });

  it('smoothly follows moving targets while preserving right-click pan offset', () => {
    let anchor: [number, number, number] = [0, 0, 18];
    let target: [number, number, number] = [0, 0, 18];

    // User right-clicks and pans the camera target by [+4.5, -2.0, 0]
    const userPanOffset: [number, number, number] = [4.5, -2.0, 0];
    target = [
      target[0] + userPanOffset[0],
      target[1] + userPanOffset[1],
      target[2] + userPanOffset[2]
    ];

    // Spacecraft moves forward from z = 18 to z = 10 over 20 frames
    const shipPos: [number, number, number] = [0, 0, 10];
    for (let i = 0; i < 20; i++) {
      const step = stepFollowTargetWithPan(target, anchor, shipPos, 0.1);
      target = step.nextTarget;
      anchor = step.nextAnchor;

      // The user's right-click pan offset (target - anchor) must remain strictly intact!
      expect(target[0] - anchor[0]).toBeCloseTo(userPanOffset[0], 6);
      expect(target[1] - anchor[1]).toBeCloseTo(userPanOffset[1], 6);
      expect(target[2] - anchor[2]).toBeCloseTo(userPanOffset[2], 6);
    }

    // Anchor has moved closer to z = 10
    expect(anchor[2]).toBeLessThan(12);
    expect(target[0]).toBeCloseTo(4.5, 6);
    expect(target[1]).toBeCloseTo(-2.0, 6);
  });

  it('ensures all 3D task scenes share TaskCameraControls instead of raw OrbitControls', () => {
    const sceneFiles = [
      resolve(process.cwd(), 'src/Scene.tsx'),
      resolve(process.cwd(), 'src/components/liftoff/LiftoffScene3D.tsx'),
      resolve(process.cwd(), 'src/components/departure/DepartureScene3D.tsx'),
      resolve(process.cwd(), 'src/components/landing/LandingScene3D.tsx')
    ];

    for (const filePath of sceneFiles) {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('TaskCameraControls');
      expect(content).not.toContain('<OrbitControls');
    }
  });
});
