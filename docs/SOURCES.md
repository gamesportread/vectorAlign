# Scientific sources and assets

Retrieved 2026-09-18. This is an independent educational project. NASA does not endorse it.

| Source | Used for | Evidence in the application |
| --- | --- | --- |
| [NASA Harmony module](https://www.nasa.gov/international-space-station/harmony-module/) | Mission setting and identification of the forward docking port | Target label and field guide |
| [NASA VTAD ISS model](https://science.nasa.gov/resource/international-space-station-3d-model/) | Historical ISS visualization | Station scene; GLB with source metadata |
| [NASA Crew Orbital Docking Simulation](https://www.nasa.gov/stem-content/crew-orbital-docking-simulation-coding-sim/) | Teaching inspiration: position, speed and docking | Four lessons and explanatory debrief |
| [NASA Dragon arrival report](https://www.nasa.gov/blogs/spacestation/2025/08/25/spacex-dragon-cargo-spacecraft-approaching-station-now/) | Autonomous docking context | Field guide distinguishes manual teaching from normal Dragon operations |
| [NASA Earth Observatory Blue Marble](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/) | Earth background, January 2004 composite | Local 2048 × 1024 JPEG texture |

Original ISS asset: `https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/i/ISS_stationary.glb` (NASA Visualization Technology Applications and Development). Source page dated 2019-04-22; glTF download entry dated 2023-09-09. This is a historical model, not a current ISS configuration or flight navigation mesh.

Reproduce the optimization with `node scripts/prepare-assets.mjs /path/to/ISS_stationary.glb`. Texture dimensions are capped at 1024 pixels; opaque texture alpha channels are removed and JPEG compressed; normals use normalized signed bytes. Vertex positions and scene hierarchy are preserved. The model shrinks from 44,495,916 to 12,815,312 bytes. Model loading requires no network decoder. The teaching capsule, capture ring, corridor, icons and star field are original procedural assets. Low quality hides selected small attachments and reduces rendering resolution.

The source PMA-2 front rim is at approximately `[0, -0.7347664, 21.0053501]` metres. The visible station is translated by `[0, 0.7347664, -21.8053501]`, with an additional 0.8 m teaching adapter leading to the port-local origin. `node scripts/derive-colliders.mjs /path/to/ISS_stationary.glb` regenerates conservative collision volumes from the registered station bounds; simulation does not read rendering meshes at runtime. Blender is not required for this scripted processing pipeline.

Earth texture credit: NASA Earth Observatory. Original: `https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x5400x2700.jpg`. Resized for the scene; no claims of current Earth imagery.

See [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and source-specific credits before redistributing assets. NASA names are used for attribution and education; NASA insignia is not used as application branding.

## Scientific simplifications

- Fixed 1/60 s semi-implicit integration of ideal resultant acceleration. Translation is in the port frame; body-axis angular velocities integrate a normalized quaternion.
- No orbital-relative, tidal, plume, mass-depletion or coupled rigid-body Euler dynamics. The sky and Earth are visual context, not an orbital propagator.
- Fuel is a teaching resource budget, not kilograms or a real vehicle's delta-v. Assist braking uses the same limited actuators and consumes that budget.
- First three lessons explicitly constrain selected degrees of freedom. Demo uses the exact same engine with a deterministic feedback controller.
- Capturing is a swept plane event at z = 0.35 m, followed by simplified soft capture. Station collision uses separate conservative boxes; rendering meshes do not define operational collision safety.
- Final lesson thresholds are invented for teaching: axial speed 0.15 m/s, lateral position 0.18 m, lateral speed 0.04 m/s, attitude error 2 degrees, angular rate 0.5 degrees/s. These are not NASA or Dragon limits.

## Competition status

2026 Space Apps participation is the project intent, not a verified qualification. The official home page lists November 14–15, 2026. The 2026 challenges and rules pages could not be reliably fetched during this implementation; do not infer eligibility or permission for pre-event development from prior years.

Before submitting, the team must record the exact selected challenge URL, compare each criterion against the table above, verify event start/development restrictions and reuse disclosures, and supply the then-current submission format. This repository is currently an educational prototype. Sources alone do not establish compliance with an unverified challenge.

Official references: [Space Apps](https://www.spaceappschallenge.org/), [rules](https://www.spaceappschallenge.org/legal/).
