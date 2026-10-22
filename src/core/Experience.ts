import * as THREE from "three";
import { KitchenEnvironment } from "../environment/KitchenEnvironment";
import { addLighting } from "../environment/Lighting";
import {
  InteractionManager,
  setObjectEmphasis,
} from "../interaction/InteractionManager";
import {
  ScenarioManager,
  type ItemId,
  type ScenarioAction,
  type ScenarioSnapshot,
} from "../scenarios/ScenarioManager";
import { SimulationManager } from "../simulation/SimulationManager";
import {
  defaultSimulationConfig,
  sanitizeConfig,
  type SimulationConfig,
} from "../simulation/SimulationConfig";
import { DesktopUI } from "../ui/DesktopUI";
import { VRUI } from "../ui/VRUI";
import type { Mode } from "../ui/content";
import { XRManager } from "../xr/XRManager";
import { DesktopControls } from "./DesktopControls";
import { Localization } from "../i18n/Localization";
import type { Message } from "../i18n/messages";

export class Experience {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(47, 1, 0.05, 40);
  private renderer: THREE.WebGLRenderer;
  private kitchen: KitchenEnvironment;
  private interactions = new InteractionManager();
  private config = { ...defaultSimulationConfig };
  private scenario = new ScenarioManager(this.config);
  private simulation = new SimulationManager(this.config);
  private desktop: DesktopUI;
  private vr: VRUI;
  private xr: XRManager;
  private controls: DesktopControls;
  private mode: Mode = "desktop";
  private previous?: Readonly<ScenarioSnapshot>;
  private hover: Record<ItemId, boolean> = { cup: false, plate: false };
  private resizeObserver: ResizeObserver;
  private abort = new AbortController();
  private unsubscribers: (() => void)[] = [];
  private xrAvailable = false;
  private xrReason: Message = "Checking headset availability…";
  private disposed = false;
  constructor(
    private host: HTMLElement,
    private localization: Localization,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.setAttribute(
      "aria-label",
      this.localization.text(
        "Kitchen view. Drag to look around; click a cup or plate to select it.",
      ),
    );
    this.renderer.domElement.tabIndex = 0;
    host.append(this.renderer.domElement);
    this.scene.background = new THREE.Color("#e4e5d7");
    this.scene.fog = new THREE.Fog("#e4e5d7", 11, 23);
    this.kitchen = new KitchenEnvironment(this.scene);
    addLighting(this.scene);
    this.desktop = new DesktopUI(
      this.config,
      (action) => this.action(action),
      (config) => this.configure(config),
      this.localization,
    );
    this.vr = new VRUI(this.scene, this.interactions, (action) =>
      this.action(action),
    );
    this.controls = new DesktopControls(
      this.camera,
      this.renderer.domElement,
      this.interactions,
      (label) => this.desktop.setHover(label),
    );
    this.xr = new XRManager(
      this.renderer,
      this.scene,
      this.camera,
      this.interactions,
      (active) => this.sessionChanged(active),
    );
    for (const id of ["cup", "plate"] as const) {
      this.interactions.register({
        id: `select:${id}`,
        mesh: this.kitchen.items[id],
        enabled: false,
        label: `Select ${id}`,
        onSelect: () => {
          this.scenario.select(id);
        },
        onHover: (value) => {
          this.hover[id] = value;
          setObjectEmphasis(
            this.kitchen.items[id],
            value,
            this.scenario.snapshot.selected === id,
          );
        },
      });
      this.interactions.register({
        id: `place:${id}`,
        mesh: this.kitchen.targets[id],
        enabled: false,
        label: `Place ${id} here`,
        onSelect: () => {
          this.scenario.place(id);
        },
        onHover: (value) => {
          this.kitchen.targets[id].scale.setScalar(value ? 1.08 : 1);
        },
      });
    }
    this.unsubscribers.push(
      this.simulation.subscribe((event) => {
        if (event === "interruption-ended") this.scenario.interruptionEnded();
      }),
    );
    this.unsubscribers.push(
      this.scenario.subscribe((snapshot) => this.update(snapshot)),
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    void this.xr.support().then(({ supported, reason }) => {
      if (this.disposed) return;
      this.xrAvailable = supported;
      this.xrReason = reason;
      this.desktop.setXRSupport(supported, reason);
    });
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && !document.querySelector("dialog[open]"))
          this.action("stop");
      },
      { signal: this.abort.signal },
    );
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        this.action("stop");
        this.desktop.toast(
          "The graphics context was interrupted. Reload this page to restore the kitchen.",
        );
      },
      { signal: this.abort.signal },
    );
    this.renderer.setAnimationLoop(() => {
      if (this.renderer.xr.isPresenting) this.xr.controllers.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
  private resize(): void {
    if (this.renderer.xr.isPresenting) return;
    const width = this.host.clientWidth,
      height = this.host.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  private action(action: string): void {
    if (action === "toggle-language") {
      this.changeLanguage();
    } else if (action === "start-desktop") {
      this.mode = "desktop";
      void this.unlockAudio();
      this.controls.reset();
      this.scenario.action("start");
    } else if (action === "start-vr") {
      if (!this.xrAvailable) {
        this.desktop.toast(
          this.xrReason || "Checking VR support. Please try again.",
        );
        return;
      }
      // Request the XR session before yielding the click's transient activation.
      const request = this.xr.enter();
      void this.unlockAudio();
      void request.catch((error) => {
        console.error("VR session could not start", error);
        this.desktop.toast(
          "VR could not start. Check headset permissions and try again. Desktop remains available.",
        );
      });
    } else if (action === "stop") {
      this.simulation.reset();
      this.scenario.action("stop");
      if (this.renderer.xr.isPresenting)
        void this.xr
          .exit()
          .catch(() =>
            this.desktop.toast("Use the headset system menu to exit VR."),
          );
    } else if (action === "toggle-sound") {
      void this.unlockAudio();
      this.configure({
        ...this.config,
        audioDistractions: !this.config.audioDistractions,
      });
    } else if (action === "reset-view") this.controls.reset();
    else if (action.startsWith("select:") || action.startsWith("place:"))
      this.interactions.activate(action);
    else if (action.startsWith("answer:"))
      this.scenario.answerInterruption(action.slice(7));
    else {
      if (action === "begin" || action === "restart") {
        void this.unlockAudio();
        if (this.mode === "desktop") this.controls.reset();
      }
      this.scenario.action(action as ScenarioAction);
    }
  }
  private async unlockAudio(): Promise<void> {
    const ready = await this.simulation.audio.unlock();
    if (!ready)
      this.desktop.toast(
        "Sound could not start. Captions and every task still work; you can try Sound again.",
      );
  }
  private changeLanguage(): void {
    const scroll = window.scrollY;
    this.localization.setLocale(
      this.localization.locale === "fi" ? "en" : "fi",
    );
    this.localization.applyDocument();
    this.interactions.clearHover();
    this.desktop.dispose();
    this.desktop = new DesktopUI(
      this.config,
      (action) => this.action(action),
      (config) => this.configure(config),
      this.localization,
    );
    this.desktop.setXRSupport(this.xrAvailable, this.xrReason);
    this.desktop.setImmersive(this.mode === "vr");
    // Re-render the same snapshot. Do not dispatch scenario events or restart timers/audio.
    this.update(this.scenario.snapshot);
    window.scrollTo({ top: scroll, behavior: "instant" });
    if (this.mode === "desktop")
      document
        .querySelector<HTMLElement>('[data-action="toggle-language"]')
        ?.focus({ preventScroll: true });
  }
  private sessionChanged(active: boolean): void {
    this.interactions.clearHover();
    this.mode = active ? "vr" : "desktop";
    this.vr.root.visible = active;
    this.desktop.setImmersive(active);
    if (active) {
      this.camera.position.set(0, 0, 0);
      this.camera.rotation.set(0, 0, 0);
      this.scenario.action("start");
    } else {
      this.simulation.reset();
      this.controls.reset();
      this.scenario.action("stop");
      this.resize();
    }
    this.update(this.scenario.snapshot);
  }
  private configure(config: SimulationConfig): void {
    this.config = sanitizeConfig(config);
    this.simulation.configure(this.config);
    this.scenario.configure(this.config);
    this.desktop.configure(this.config);
    this.update(this.scenario.snapshot);
  }
  private update(snapshot: Readonly<ScenarioSnapshot>): void {
    this.host.setAttribute(
      "aria-label",
      this.localization.text("Interactive 3D Nordic kitchen"),
    );
    this.renderer.domElement.setAttribute(
      "aria-label",
      this.localization.text(
        "Kitchen view. Drag to look around; click a cup or plate to select it.",
      ),
    );
    const previous = this.previous;
    this.previous = snapshot;
    if (previous?.state !== snapshot.state) {
      this.simulation.reset();
      this.desktop.toast("");
      this.desktop.setHover("");
      this.interactions.clearHover();
      if (snapshot.state === "interruption")
        this.simulation.triggerInterruption();
      else if (snapshot.state === "place-plate")
        this.simulation.enableAudioDistraction();
      if (snapshot.cupPlaced && !previous?.cupPlaced)
        this.desktop.toast("Cup placed. One small step, done.");
      if (snapshot.platePlaced && !previous?.platePlaced)
        this.desktop.toast("Your breakfast setting is complete.");
    }
    this.kitchen.update(snapshot, this.config.showHints);
    for (const id of ["cup", "plate"] as const) {
      this.interactions.setLabel(
        `select:${id}`,
        this.localization.text(id === "cup" ? "Select cup" : "Select plate"),
      );
      this.interactions.setLabel(
        `place:${id}`,
        this.localization.text(
          id === "cup" ? "Place cup here" : "Place plate here",
        ),
      );
      this.interactions.setEnabled(`select:${id}`, this.scenario.canSelect(id));
      this.interactions.setEnabled(`place:${id}`, this.scenario.canPlace(id));
      setObjectEmphasis(
        this.kitchen.items[id],
        this.hover[id],
        snapshot.selected === id,
      );
    }
    this.desktop.render(snapshot, this.mode);
    this.vr.update(snapshot, this.config, this.localization.locale);
    this.controls.enabled =
      this.mode === "desktop" &&
      ["familiarization", "place-cup", "place-plate", "completed"].includes(
        snapshot.state,
      );
    if (snapshot.state === "welcome" && this.mode === "desktop") {
      this.camera.position.set(3.65, 2.65, 4.65);
      this.camera.lookAt(-0.15, 1.1, -1.05);
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.updateMatrixWorld(true);
  }
  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.unsubscribers.forEach((remove) => remove());
    this.xr.dispose();
    this.controls.dispose();
    this.vr.dispose();
    this.desktop.dispose();
    this.interactions.dispose();
    this.simulation.dispose();
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((material) => materials.add(material));
      }
      if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.renderer.dispose();
    this.host.replaceChildren();
  }
}
