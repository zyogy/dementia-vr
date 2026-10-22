import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { InteractionManager } from "../src/interaction/InteractionManager";

describe("Shared desktop / XR interaction API", () => {
  it("raycasts nested meshes and activates their registered owner", () => {
    const manager = new InteractionManager(),
      group = new THREE.Group();
    group.add(
      new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()),
    );
    group.position.z = -3;
    group.updateMatrixWorld();
    const onSelect = vi.fn();
    manager.register({
      id: "cup",
      mesh: group,
      enabled: true,
      label: "Cup",
      onSelect,
    });
    const desktopRay = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -1),
    );
    const controllerRay = new THREE.Raycaster(
      new THREE.Vector3(0.1, 0, 0),
      new THREE.Vector3(0, 0, -1),
    );
    expect(manager.hit(desktopRay)?.entry.id).toBe("cup");
    expect(manager.hit(controllerRay)?.entry.id).toBe("cup");
    expect(manager.activate("cup")).toBe(true);
    expect(onSelect).toHaveBeenCalledOnce();
  });
  it("does not select disabled objects or hidden VR panels and clears hover", () => {
    const manager = new InteractionManager(),
      group = new THREE.Group(),
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(),
        new THREE.MeshBasicMaterial(),
      );
    group.add(mesh);
    group.position.z = -2;
    group.updateMatrixWorld();
    const onHover = vi.fn();
    const onSelect = vi.fn();
    const remove = manager.register({
      id: "button",
      mesh,
      enabled: true,
      label: "Button",
      onSelect,
      onHover,
    });
    manager.raycaster.ray.direction.set(0, 0, -1);
    const entry = manager.hit()!.entry;
    manager.hover("left", entry);
    manager.hover("right", entry);
    manager.hover("left", null);
    expect(onHover).not.toHaveBeenCalledWith(false);
    manager.setEnabled("button", false);
    expect(onHover).toHaveBeenLastCalledWith(false);
    expect(manager.activate("button")).toBe(false);
    manager.setEnabled("button", true);
    group.visible = false;
    expect(manager.hit()).toBeNull();
    expect(manager.activate("button")).toBe(false);
    group.visible = true;
    remove();
    expect(manager.hit()).toBeNull();
  });
});
