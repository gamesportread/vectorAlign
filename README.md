# Vector Align · Orbital Academy

A bilingual, local-first spacecraft docking teaching simulator for desktop and mobile browsers. Four lessons teach inertia, lateral drift, attitude control and a complete 50 m approach to the ISS Harmony forward port. Installable as a PWA.

## Run

Node.js 22.12+ or 24 LTS, npm.

```sh
npm ci
npm run dev
npm test
npm run test:api
npm run build
npm run preview -- --port 4173
```

For browser tests, install Playwright Chromium (`npx playwright install chromium`), run the production preview on port 4173, then `npm run test:e2e`.

Prefer `npm run test:api` for routine verification. The small `src/testing/flight-driver.ts` interface calls the same session actions and fixed-step scheduler as the visible UI: `load`, `start`, `control`, `advance`, `pause`, `resume`, `release`, and immutable `snapshot`. It covers full lesson completion, progression, failures, records and retries without rendering 3D. Browser tests are reserved for layout, input wiring and service-worker behavior. Use `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` to test with an already installed Chrome.

## Controls

| Action | Keyboard |
| --- | --- |
| Left / right | A / D |
| Down / up | S / W |
| Approach / back away | R / F |
| Pitch / yaw | Arrow keys |
| Roll | Q / E |
| Active assist braking | Hold Space |
| Pause | Escape |

Touch controls support press-and-hold, multiple pointers and cancellation. Mode switching clears commands. Window blur and backgrounding pause the simulation. Training constraints are shown under the scene. Demonstrations do not award progress; independently completing mission 4 unlocks configurable free flight.

## Structure

- `src/sim`: pure deterministic dynamics, configuration, capture and collision logic, test suite.
- `src/store.ts`: session lifecycle, unified commands, fixed-step scheduler, feedback demonstrations and telemetry.
- `src/Scene.tsx`: render-only scene and cameras.
- `src/App.tsx`: bilingual lesson flow, touch / keyboard controls, debriefs, field guide, lab and installation.
- `src/storage.ts`: device-local IndexedDB profile and latest flight.
- `scripts/prepare-assets.mjs`: reproducible NASA-model processing and PWA icons.

The simulator runs at 60 Hz, independently from render FPS; long stalls are capped and backgrounding pauses. UI telemetry publishes at approximately 12 Hz. Flight samples are captured at 5 Hz. Training demo is 4× wall-clock speed but retains the same 1/60 s physical step.

## Distribution

Local delivery only. Do not publish this project to ChatGPT Sites.

`npm run build` outputs a static `dist/` directory. Serve it over HTTPS with HTML fallback to `index.html`. Cache hashed assets long term; avoid long-lived caching of `index.html`, `sw.js`, and `manifest.webmanifest`. The PWA precaches core scene resources and only offers updates after leaving a flight. The app needs no API key, account or backend.

See [sources and scientific limits](docs/SOURCES.md) and the [acceptance / learner-study checklist](docs/ACCEPTANCE.md). Physical-device testing, target-user testing and 2026 competition qualification require separate verification.
