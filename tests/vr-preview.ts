// Development-only fixture, excluded from the production entry point/build.
import * as THREE from "three";
import { VRUI } from "../src/ui/VRUI";
import { KitchenEnvironment } from "../src/environment/KitchenEnvironment";
import { addLighting } from "../src/environment/Lighting";
import { InteractionManager } from "../src/interaction/InteractionManager";
import {
  ScenarioManager,
  type ScenarioAction,
  type ScenarioSnapshot,
  type ScenarioState,
} from "../src/scenarios/ScenarioManager";
import { defaultSimulationConfig } from "../src/simulation/SimulationConfig";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#e4e5d7");
const camera = new THREE.PerspectiveCamera(
  47,
  innerWidth / innerHeight,
  0.05,
  30,
);
camera.position.set(0, 1.62, 2.65);
camera.lookAt(0, 1.72, -0.45);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const kitchen = new KitchenEnvironment(scene);
addLighting(scene);
const interactions = new InteractionManager(),
  scenario = new ScenarioManager(defaultSimulationConfig);
let config = { ...defaultSimulationConfig },
  current: Readonly<ScenarioSnapshot> = scenario.snapshot;
const output = document.querySelector<HTMLOutputElement>("#action")!;
const panel = new VRUI(scene, interactions, (action) => {
  output.textContent = `Selected: ${action}`;
  if (action === "toggle-sound") {
    config = { ...config, audioDistractions: !config.audioDistractions };
    panel.update(current, config);
  } else if (action.startsWith("answer:"))
    scenario.answerInterruption(action.slice(7));
  else scenario.action(action as ScenarioAction);
});
panel.root.visible = true;
scenario.subscribe((snapshot) => {
  current = snapshot;
  panel.update(snapshot, config);
  kitchen.update(snapshot, true);
});
scenario.action("start");
const select = document.querySelector<HTMLSelectElement>("#screen")!;
select.addEventListener("change", () => {
  const state = select.value as ScenarioState;
  scenario.action("restart");
  if (state !== "intro") scenario.action("continue");
  if (!["intro", "tutorial"].includes(state)) scenario.action("begin");
  if (
    ["interruption", "place-plate", "completed", "reflection"].includes(state)
  ) {
    scenario.select("cup");
    scenario.place("cup");
    scenario.interruptionEnded();
  }
  if (["place-plate", "completed", "reflection"].includes(state)) {
    scenario.answerInterruption("breakfast");
    scenario.action("return-task");
  }
  if (["completed", "reflection"].includes(state)) {
    scenario.select("plate");
    scenario.place("plate");
  }
  if (state === "reflection") scenario.action("reflect");
});
document.querySelector("#reset")!.addEventListener("click", () => {
  scenario.action("restart");
  select.value = "intro";
});
const pointer = new THREE.Vector2();
function hit(event: PointerEvent) {
  pointer.set(
    (event.clientX / innerWidth) * 2 - 1,
    -(event.clientY / innerHeight) * 2 + 1,
  );
  interactions.raycaster.setFromCamera(pointer, camera);
  return interactions.hit();
}
renderer.domElement.addEventListener("pointermove", (event) => {
  const result = hit(event);
  interactions.hover("mouse", result?.entry ?? null);
});
renderer.domElement.addEventListener("pointerup", (event) => {
  const result = hit(event);
  if (result) interactions.activate(result.entry.id);
});
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => renderer.render(scene, camera));
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    panel.dispose();
    renderer.setAnimationLoop(null);
    renderer.dispose();
  });
