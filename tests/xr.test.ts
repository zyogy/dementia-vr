import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { ControllerManager } from "../src/xr/ControllerManager";
import { XRManager } from "../src/xr/XRManager";
import { InteractionManager } from "../src/interaction/InteractionManager";

function mockRenderer() {
  const controllers = [new THREE.Group(), new THREE.Group()];
  const listeners = new Map<string, () => void>();
  const xr = {
    enabled: false,
    isPresenting: false,
    getController: (index: number) => controllers[index],
    setReferenceSpaceType: vi.fn(),
    setFramebufferScaleFactor: vi.fn(),
    setSession: vi.fn(async () => {}),
    getSession: vi.fn(),
    addEventListener: (name: string, listener: () => void) =>
      listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  return {
    renderer: { xr } as unknown as THREE.WebGLRenderer,
    controllers,
    xr,
    listeners,
  };
}
describe("WebXR integration (mock runtime; not physical hardware)", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("both controllers use the same ray selection path and disconnect safely", () => {
    const { renderer, controllers } = mockRenderer(),
      interactions = new InteractionManager();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
    );
    mesh.position.z = -2;
    mesh.updateMatrixWorld();
    const select = vi.fn();
    interactions.register({
      id: "cup",
      mesh,
      label: "cup",
      enabled: true,
      onSelect: select,
    });
    const manager = new ControllerManager(
      renderer,
      new THREE.Group(),
      interactions,
    );
    for (const controller of controllers) {
      controller.dispatchEvent({ type: "connected" } as never);
      manager.update();
      controller.dispatchEvent({ type: "select" } as never);
      controller.dispatchEvent({ type: "disconnected" } as never);
      controller.dispatchEvent({ type: "select" } as never);
    }
    expect(select).toHaveBeenCalledTimes(2);
    manager.dispose();
  });
  it("checks secure context and handles unavailable runtimes gracefully", async () => {
    vi.stubGlobal("window", { isSecureContext: false });
    vi.stubGlobal("navigator", {});
    const { renderer } = mockRenderer();
    const xr = new XRManager(
      renderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      new InteractionManager(),
      vi.fn(),
    );
    expect((await xr.support()).supported).toBe(false);
    vi.stubGlobal("window", { isSecureContext: true });
    expect((await xr.support()).reason).toContain("Meta Quest");
    xr.dispose();
  });
  it("requests immersive VR, establishes a seated origin, and resets on session end", async () => {
    const session = { end: vi.fn(async () => {}) },
      requestSession = vi.fn(async () => session);
    vi.stubGlobal("navigator", {
      xr: { requestSession, isSessionSupported: vi.fn(async () => true) },
    });
    vi.stubGlobal("window", { isSecureContext: true });
    const mock = mockRenderer(),
      change = vi.fn();
    mock.xr.getSession.mockReturnValue(session);
    const xr = new XRManager(
      mock.renderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      new InteractionManager(),
      change,
    );
    expect((await xr.support()).supported).toBe(true);
    await xr.enter();
    expect(requestSession).toHaveBeenCalledWith("immersive-vr", {
      optionalFeatures: ["local-floor"],
    });
    expect(mock.xr.setReferenceSpaceType).toHaveBeenCalledWith("local");
    expect(mock.xr.setSession).toHaveBeenCalledWith(session);
    expect(xr.rig.position.toArray()).toEqual([0, 1.62, 2.65]);
    expect(change).toHaveBeenCalledWith(true);
    await xr.exit();
    expect(session.end).toHaveBeenCalledOnce();
    mock.listeners.get("sessionend")!();
    expect(xr.rig.position.toArray()).toEqual([0, 0, 0]);
    expect(change).toHaveBeenLastCalledWith(false);
    xr.dispose();
  });
  it("cleans up a partially initialized session after a renderer failure", async () => {
    const session = { end: vi.fn(async () => {}) };
    vi.stubGlobal("navigator", {
      xr: { requestSession: vi.fn(async () => session) },
    });
    const mock = mockRenderer();
    mock.xr.setSession.mockRejectedValue(new Error("Initialization failed"));
    const change = vi.fn(),
      xr = new XRManager(
        mock.renderer,
        new THREE.Scene(),
        new THREE.PerspectiveCamera(),
        new InteractionManager(),
        change,
      );
    await expect(xr.enter()).rejects.toThrow("Initialization failed");
    expect(session.end).toHaveBeenCalledOnce();
    expect(xr.rig.position.toArray()).toEqual([0, 0, 0]);
    expect(change).not.toHaveBeenCalled();
    xr.dispose();
  });
});
