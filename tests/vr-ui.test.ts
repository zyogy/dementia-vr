import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { VRUI } from "../src/ui/VRUI";
import { InteractionManager } from "../src/interaction/InteractionManager";
import { ScenarioManager } from "../src/scenarios/ScenarioManager";
import { defaultSimulationConfig } from "../src/simulation/SimulationConfig";

function fixture() {
  const ctx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 14 }),
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  vi.stubGlobal("document", { createElement: () => canvas });
  const manager = new InteractionManager(),
    scenario = new ScenarioManager(defaultSimulationConfig),
    onAction = vi.fn();
  const panel = new VRUI(new THREE.Scene(), manager, onAction);
  return { panel, manager, scenario, onAction, ctx };
}

describe("World-space panel lifecycle", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("replaces uploaded texture storage when panel dimensions change", () => {
    const { panel, scenario } = fixture();
    scenario.action("start");
    panel.update(scenario.snapshot, defaultSimulationConfig);
    const mesh = panel.root.children[0] as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshBasicMaterial
    >;
    const fullTexture = mesh.material.map!,
      onDispose = vi.fn();
    fullTexture.addEventListener("dispose", onDispose);
    scenario.action("continue");
    scenario.action("begin");
    panel.update(scenario.snapshot, defaultSimulationConfig);
    expect(mesh.material.map).not.toBe(fullTexture);
    expect(onDispose).toHaveBeenCalledOnce();
    const compactTexture = mesh.material.map;
    scenario.select("cup");
    panel.update(scenario.snapshot, defaultSimulationConfig);
    expect(mesh.material.map).toBe(compactTexture); // Same-sized redraws reuse storage.
    panel.dispose();
  });
  it("registers full-size and compact controls without duplicate IDs or stale actions", () => {
    const { panel, manager, scenario, onAction, ctx } = fixture();
    panel.root.visible = true;
    scenario.action("start");
    panel.update(scenario.snapshot, defaultSimulationConfig);
    expect(manager.activate("vr:continue")).toBe(true);
    expect(onAction).toHaveBeenCalledWith("continue");
    scenario.action("continue");
    scenario.action("begin");
    panel.update(scenario.snapshot, defaultSimulationConfig);
    expect(manager.activate("vr:continue")).toBe(false);
    for (const action of ["toggle-sound", "restart", "stop"])
      expect(manager.activate(`vr:${action}`)).toBe(true);
    scenario.select("cup");
    scenario.place("cup");
    scenario.interruptionEnded();
    scenario.answerInterruption("breakfast");
    scenario.action("return-task");
    scenario.select("plate");
    scenario.place("plate");
    scenario.action("reflect");
    expect(() =>
      panel.update(scenario.snapshot, defaultSimulationConfig),
    ).not.toThrow();
    expect(manager.activate("vr:restart")).toBe(true);
    expect(manager.activate("vr:stop")).toBe(true);
    const words = ctx.fillText.mock.calls.map((call) => call[0]).join(" ");
    expect(words).toContain("Miten keskeytys");
    expect(words).toContain("Miten taustan häiriötekijät");
    expect(words).toContain("Miten hoitaja");
    panel.root.visible = false;
    expect(manager.activate("vr:stop")).toBe(false);
    panel.dispose();
    expect(manager.activate("vr:restart")).toBe(false);
  });
  it("switches world-space copy and keeps raycast actions and selected objects intact", () => {
    const { panel, manager, scenario, onAction, ctx } = fixture();
    panel.root.visible = true;
    scenario.action("start");
    scenario.action("continue");
    scenario.action("begin");
    scenario.select("cup");
    const snapshot = scenario.snapshot;
    panel.update(snapshot, defaultSimulationConfig, "fi");
    expect(ctx.fillText.mock.calls.map((call) => call[0]).join(" ")).toContain(
      "Paikka kupille.",
    );
    expect(manager.activate("vr:toggle-language")).toBe(true);
    expect(onAction).toHaveBeenLastCalledWith("toggle-language");
    ctx.fillText.mockClear();
    panel.update(snapshot, defaultSimulationConfig, "en");
    const words = ctx.fillText.mock.calls.map((call) => call[0]).join(" ");
    expect(words).toContain("A place for your cup.");
    expect(words).toContain("Suomi");
    expect(words).not.toContain("Paikka kupille.");
    expect(scenario.snapshot).toEqual(snapshot);
    expect(manager.activate("vr:stop")).toBe(true);
    panel.dispose();
  });
});
