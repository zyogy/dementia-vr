# A Different Perspective

An interactive, client-side dementia-awareness training MVP for desktop browsers and Meta Quest Browser. A furnished Nordic kitchen supports one complete breakfast exercise: select and place a cup, encounter a gentle interruption, reconnect with the task, place a plate amid optional background sounds, then reflect.

**[Open the live experience](https://zyogy.github.io/dementia-vr/)** · [Source repository](https://github.com/zyogy/dementia-vr)

**Copyright (c) 2026 zyogy. Noncommercial use only.** Public source does not mean unrestricted reuse. The [custom license](LICENSE) allows noncommercial use and modification with preserved notices; commercial use, commercial modifications, paid training, internal business use, and commercial redistribution require prior written permission from the owner. Ownership remains with the respective copyright holders. Third-party packages retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.txt). This project is source-available, not open source.

**Educational scope:** this illustrates selected attention and task-continuity challenges. It does not reproduce dementia, diagnose anyone, or imply that all people living with dementia share the same experiences. Use it to start a facilitated conversation. There is no score, deadline, flashing effect, forced camera movement, or simulated visual impairment.

## Languages

**Finnish is the default** for new visitors. The Finnish title is **Toinen näkökulma**. Select **English** in the desktop header or on any VR panel to switch to English; select **Suomi** to switch back. The controls work during the scenario without resetting the current task, selected object, interruption timer, or sound settings. An explicit language choice is saved in this browser's local storage; if storage is unavailable, it lasts for the current page session.

Both languages cover the welcome screen, tutorial, tasks, answer feedback, reflection, settings, sound captions, object labels, accessibility labels, browser title, and user-facing errors. The world-space language button uses the same controller raycasting as other VR controls. Code, action IDs, developer documentation, and the original legal license remain in English.

Translations live in `src/i18n/messages.ts`, with typed English source messages as keys and Finnish values. `Localization.ts` handles the preference and document metadata; `ui/content.ts` provides translated scenario content to both interfaces. No translation service or extra runtime dependency is used.

## Run locally

Use **Node.js 22.12+ or Node.js 24 LTS** and npm. From this project directory:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally `http://localhost:5173`). `npm install` also works for an initial install. A headset is not necessary for desktop mode. Enable hardware acceleration; the renderer requires WebGL 2.

```sh
npm test           # Deterministic scenario, interaction, simulation, and mocked XR tests
npm run typecheck  # Strict TypeScript validation
npm run build      # TypeScript validation + static production build
npm run preview    # Serve the production dist/ locally (normally port 4173)
```

The production output is `dist/`. Host that directory on any HTTPS static server. Relative asset URLs support deployment under a subdirectory. There is no server application, authentication, paid API, runtime CDN, external font, database, or downloaded model. After loading the bundled app it needs no network service; this is not an offline-installable PWA.

## GitHub Pages publishing

The public repository is `zyogy/dementia-vr`; its site is **https://zyogy.github.io/dementia-vr/**. In repository **Settings → Pages**, the publishing source must be **GitHub Actions**.

The workflow in `.github/workflows/pages.yml` installs the locked dependencies with Node.js 24, runs all tests, checks TypeScript, builds `dist/`, and publishes the result on every push to `main`. Pull requests run validation without deploying. You can also run the workflow manually from the Actions tab. Do not commit `dist/` or `node_modules/`.

The relative Vite base (`./`) supports this repository's `/dementia-vr/` path. Production builds include `LICENSE.txt` and `THIRD_PARTY_NOTICES.txt`, and the welcome-page footer links to the license. The live HTTPS URL can be opened directly in Meta Quest Browser without local certificates or USB forwarding. Physical headset validation is still required using the checklist below.

## Controls and flow

Start → introduction → controls tutorial → cup → interruption → plate → completion → reflection.

**Desktop**

- Drag the kitchen view with the left mouse button to look around from a fixed eye-height position.
- Click the sage cup on the counter. Click the highlighted circle on the table to place it.
- Select the object again to cancel a selection. A drag never places an object.
- After the interruption, choose any answer and read the supportive reminder. No answer is penalized.
- Select the cream plate and its table destination. Continue to reflection.
- The on-screen **Select** and **Place** buttons offer the same interaction path using Tab and Enter. Arrow keys look around when focus is outside form controls; Home or **Reset view** restores the view.
- **Settings** changes sound, intensity, interruptions, and hints. **Restart** returns to the introduction and resets both objects. **Exit experience** or Escape stops the scenario. Escape closes an open settings dialog first.

**VR**

- Open the welcome screen in Meta Quest Browser and select **Enter VR**. Unsupported browsers show a readable explanation and retain desktop mode.
- Look around naturally. Stay in one place; artificial locomotion is not needed.
- Aim either controller’s visible ray at an object or panel button; press and release the trigger to select it.
- Select an object, then its highlighted table destination. Objects snap into place; no grabbing or physics are required.
- Introduction, tutorial, instructions, interruption choices, continuation, reflection, **Sound**, **Restart**, **Stop / exit VR**, and the **English / Suomi** switch are canvas-textured world-space panels. Immersive mode does not depend on DOM overlays. Control labels follow the selected language.
- The `local` reference space is placed at a nominal eye height of 1.62 m, so initial seating/standing height does not require a calibration step. Start facing forward. Physical head movement remains tracked; don't change from sitting to standing mid-session. The headset's system exit also cancels the exercise and returns to welcome.

## Meta Quest and secure-context setup

Immersive WebXR requires a secure context and a user gesture. An ordinary `http://192.168.x.x:5173` LAN URL is **not** sufficient. The desktop experience can use that HTTP URL, but Enter VR will explain why it is unavailable. `localhost` is treated as trustworthy only on the device opening the page.

Choose one development route:

### USB forwarding (no certificate setup)

1. Enable developer mode on your own Quest and connect it to the computer by USB. Approve its USB debugging prompt.
2. Start `npm run dev` on the computer.
3. With the official Android Platform Tools installed, run `adb reverse tcp:5173 tcp:5173`. Alternatively, use Chrome's `chrome://inspect/#devices` port forwarding as described in Meta's guide below.
4. Open `http://localhost:5173` **inside Meta Quest Browser**. The reverse mapping routes that device-local address to the computer.
5. Select Enter VR and allow the normal immersive-session prompt. If it is unavailable, verify `window.isSecureContext`, browser support, the port mapping, and whether another XR session is active.

### Trusted HTTPS over your local network

1. Keep the computer and Quest on the same trusted network. Identify the computer's LAN IP or local hostname.
2. Obtain a certificate valid for that IP/hostname whose issuing CA is trusted by the headset browser. A locally generated certificate requires installing/trusting its CA on the test headset through an appropriate supported device-management workflow. A certificate trusted only by your desktop computer is insufficient. Do not rely on bypassing a browser certificate warning.
3. Store the certificate and private key locally, for example in the gitignored `.certs/` directory.
4. Launch Vite with those paths. PowerShell example:

   ```powershell
   $env:VITE_HTTPS_CERT = (Resolve-Path '.certs/kitchen-cert.pem').Path
   $env:VITE_HTTPS_KEY = (Resolve-Path '.certs/kitchen-key.pem').Path
   npm run dev
   ```

   POSIX shell example:

   ```sh
   VITE_HTTPS_CERT=.certs/kitchen-cert.pem VITE_HTTPS_KEY=.certs/kitchen-key.pem npm run dev
   ```

5. Open `https://<certificate-matching-LAN-host>:5173` in Quest Browser. Allow incoming connections to that port only as needed for the trusted development network. The page must load without a certificate error.

For stakeholder demonstrations, a static HTTPS deployment with an ordinarily trusted certificate is often simpler. No hosting service is required by this project. Never commit private certificate keys. Vite's development and preview servers are for development, not public production hosting.

References: [Three.js WebXR setup](https://threejs.org/manual/pages/how-to-create-vr-content.html), [MDN secure context and session requirements](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession), and [Meta WebXR first steps and debugging](https://developers.meta.com/vr/documentation/web/webxr-first-steps/).

## Configuration and implementation

Defaults live in `src/simulation/SimulationConfig.ts`:

```ts
{
  audioDistractions: true,
  audioIntensity: 0.3,       // Clamped to 0–1; overall output is deliberately restrained
  taskInterruptions: true,
  showHints: true,
  enableVisualEffects: false,
}
```

Desktop settings can change these during a session. Turning off interruptions during one returns to the plate task. Turning off hints removes source-object hint rings, while placement destinations remain visible. Settings persist across restarts for the current page session, not across page reloads. VR exposes a large Sound on/off control; set intensity, hints, and interruption preferences on the welcome screen before entering VR.

`audioDistractions` controls all procedural audio, including the phone. Muting does not remove the captioned interruption; `taskInterruptions` controls that separately. Sound starts only after a user gesture. The phone fades in gently, and the plate stage uses ticking, occasional soft kitchen tones, and abstract voice-like murmurs without real speech. This is stereo panning, not head-tracked spatial audio. Backgrounding the page suspends audio and avoids accumulating scheduled voices. Completion, stop, reset, and session end stop sounds and pending interruption timers.

`ScenarioManager` is a deterministic state machine with selection and placement guards. `SimulationManager` owns timers and event-based distractions. `InteractionManager` owns a common registration, hover, raycast, and activation API for DOM assist buttons, mouse clicks, and XR controller rays. Environment objects contain no scenario progression logic. `content.ts` is the common copy source for desktop and VR. `VRUI` keeps instructions in stable world-space positions and moves between full and compact panels only at stage transitions; it never attaches UI to the user's head.

The visual-effects interface is an extension point only: there are no effects registered by default, and enabling the flag alone does nothing. Any future effect needs its own educational and comfort validation.

## Project structure

```text
index.html
LICENSE / THIRD_PARTY_NOTICES.txt
.github/workflows/pages.yml  # Validate pull requests; deploy main to Pages
package.json / package-lock.json
tsconfig.json / vite.config.ts
src/
  main.ts
  i18n/
    messages.ts              # Typed English messages and Finnish translations
    Localization.ts          # Finnish default, saved preference, document language
  core/
    Experience.ts            # Lifecycle and integration
    DesktopControls.ts       # Fixed-position mouse and keyboard look
  environment/
    KitchenEnvironment.ts    # Procedural room, objects, targets, batching
    Furniture.ts             # Shared geometry/material construction
    Lighting.ts
  interaction/
    InteractionManager.ts    # Shared selection, hover, and raycasting
  scenarios/
    ScenarioManager.ts       # Deterministic breakfast state machine
  simulation/
    SimulationConfig.ts
    SimulationManager.ts     # Interruption events and visual-effect interface
    AudioManager.ts          # Gesture-gated procedural sound
  xr/
    XRManager.ts             # Support detection and session lifecycle
    ControllerManager.ts     # Two pointing rays and trigger events
  ui/
    content.ts
    DesktopUI.ts
    VRUI.ts                  # Canvas textures and raycastable controls
  styles/
    main.css
tests/
  scenario.test.ts
  interaction.test.ts
  simulation.test.ts
  xr.test.ts                 # Mocked runtime; no hardware claims
  vr-ui.test.ts              # Panel controls and GPU texture lifecycle regression
  localization.test.ts       # Preferences, translated variants, stable action IDs
  vr-ui.html / vr-preview.ts # Development-only real world-space panel fixture
```

`public/` is not needed because all visual/audio assets are generated locally. `dist/` and `node_modules/` are generated and ignored. No placeholder asset downloads are required.

## Validation and real-headset checklist

Automated tests cover the full scenario and supportive answer branches, invalid and duplicate placements, selection cancellation, configuration changes, resets, late callbacks, shared nested-mesh raycasting, multi-pointer hover, hidden/disabled controls, interruption cleanup, both controller trigger paths, support checks, and XR session lifecycle failure handling.

Implementation validation: **26 tests pass**, strict TypeScript and the production build pass. The complete desktop flow was exercised through 3D scene clicks; keyboard assist buttons, quiet-mode settings, restart, stop, responsive layout, and world-space panel controls were also checked in a browser. Finnish localization was checked through the complete scenario, language switching with a selected cup and during an interruption, preference persistence, mobile layouts, and the actual VR panels. Tests cover both languages' screen variants and stable action IDs, storage failures, and the VR language button. A texture-resizing defect found during world-space panel inspection was fixed and covered by a regression test. No browser console errors were observed during those checks.

While running Vite, open `/tests/vr-ui.html` to inspect the **actual** world-space panels with a mouse ray. Its selector exposes every key screen and the buttons use the real state machine. This fixture is excluded from the production build and is not a WebXR/headset emulator.

Before a real demonstration, test on the intended Quest hardware:

- [ ] Start from a secure context; accept the session normally; verify stereo rendering and tracking.
- [ ] Try seated and standing starts separately; check initial eye height, forward direction, panel legibility, and comfortable reach by ray.
- [ ] Read introduction/tutorial in VR and use either controller for every panel button.
- [ ] Check Finnish text readability; switch to English and back with either controller during a task. Confirm the selected object and progress remain unchanged.
- [ ] Select/cancel/select cup; place it; verify a single interruption and correctly captioned gentle sound.
- [ ] Try each answer, resume, mute/unmute, place the plate, and read all three reflection prompts.
- [ ] Restart during the ring and during the plate task; verify objects, highlights, sound, and timers reset.
- [ ] Exit through the in-world Stop button and the headset menu; re-enter successfully.
- [ ] Disconnect/reconnect each controller; check no stale hover or accidental selection.
- [ ] Check comfort, perceived volume, GPU frame timing, and thermals using headset developer tools over a longer session.

**Physical headset testing has not been performed here. No particular headset frame rate is claimed.** Software and desktop verification cannot establish real-device comfort, tracking behavior, stereo quality, or performance.

## Performance, limitations, and next steps

Static meshes are merged by material; geometry and materials are reused; there is one shadow-casting light and a 1024px shadow map updated only when state changes. Pixel ratio is capped, XR rendering uses `setAnimationLoop`, raycaster scratch objects are reused, there is no post-processing or physics, and lifecycle teardown disposes resources. The kitchen is stylized procedural geometry rather than photorealistic or production GLTF artwork.

This MVP has one scenario, Finnish and English text, no saved responses or analytics, no hand tracking, no locomotion, and no real recorded conversation. The development fixture checks panel functionality without reproducing headset optics or controller tracking. The three-dimensional kitchen is visually led; keyboard assist buttons and readable HTML provide an alternative interaction path, but this is not a certified screen-reader-only training curriculum. Browser/device compatibility, Finnish terminology, and educational effectiveness should be evaluated with care professionals and people with lived experience.

Future work can replace environment builders with GLTF assets while retaining interaction IDs, introduce a scenario catalog and additional environments, extend the translation catalog to further languages, add instructor controls, hand-tracking adapters, head-tracked audio, consent-based analytics, and guided sessions. None of those features are required to run this vertical slice.
