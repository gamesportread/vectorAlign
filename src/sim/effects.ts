let cameraShakeIntensity = 0;

export function triggerCameraShake(intensity = 1.2): void {
  cameraShakeIntensity = Math.min(2.5, cameraShakeIntensity + intensity);
}

export function getCameraShake(): number {
  return cameraShakeIntensity;
}

export function decayCameraShake(damping = 0.88): number {
  const current = cameraShakeIntensity;
  if (cameraShakeIntensity > 0.005) {
    cameraShakeIntensity *= damping;
  } else {
    cameraShakeIntensity = 0;
  }
  return current;
}

export function resetCameraShake(): void {
  cameraShakeIntensity = 0;
}

