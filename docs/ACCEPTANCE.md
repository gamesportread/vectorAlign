# Acceptance and field testing

Automated checks cover dynamics invariants, braking costs, disclosed constraints, contact limits, swept collisions, 30/60/120 FPS determinism, demonstration completion, navigation, language, controls, dialogs and persisted debriefs.

Real hardware and student testing must not be claimed from browser emulation. Record the following during team acceptance:

| Platform | Device / OS / browser | Missions 1–4 | Sustained FPS | PWA installation | Offline | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Windows | Team to supply | | Target 60 | | | Pending |
| macOS | Team to supply | | Target 60 | | | Pending |
| Android | Team to supply | | Target 30 in low quality | | | Pending |
| iPhone | Team to supply | | Target 30 in low quality | | | Pending |

Check release, simultaneous inputs, pointer cancel, background / foreground, screen rotation, zoomed text, lost WebGL context, initial network failure, fully cached airplane mode, interrupted cache installation and updates after exiting a flight. A first offline visit cannot work; a complete service-worker precache is required.

## Five-learner study

Recruit five middle-school / general-public learners. Do not coach during the first mission. Record completion, time, mistaken actions and their answer to “Why does releasing thrust not stop the spacecraft?” Acceptance target: four of five complete lesson 1 and explain inertia without developer explanation. The team must actually run and record this study; no synthetic participant results are included.

## Demonstration recording script

1. Show mission 1, release thrust, explain coasting, then reverse thrust to hold.
2. Show lateral velocity versus lateral position in mission 2.
3. Show attitude and angular rate in mission 3.
4. Fly mission 4 or clearly identify the 4× demonstration controller.
5. Show debrief curves and the field-guide source / simplification notes.
6. Show mobile controls and an offline run after installation.

## Verification performed — 2026-09-24

- Production TypeScript / Vite / PWA build passes. Core precache is approximately 14 MB.
- 28 headless engine/session API tests pass via `npm run test:api`. The same scheduler and actions drive the app and the test driver; only IndexedDB is mocked for Node tests.
- Desktop Chrome and an iPhone-sized Chromium viewport passed navigation, language, demonstration/debrief, persistence, installation guidance, offline reload, pointer release and blur-pause checks. A mobile selector that targeted a deliberately hidden heading was corrected and its affected test passed on rerun.
- Portrait and landscape flight layouts keep scene, telemetry and thrust controls in the viewport. This is browser emulation, not physical iPhone/Safari or Android hardware validation.
- Native WebMCP availability was not tested. Optional read/pause registration is feature-detected; it is not required by the simulator.
- No ChatGPT Sites deployment was performed. Local preview and production build are the delivery artifacts.
