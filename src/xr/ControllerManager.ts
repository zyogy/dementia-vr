import * as THREE from "three";
import { InteractionManager } from "../interaction/InteractionManager";

export class ControllerManager {
  private controllers: {
    controller: THREE.XRTargetRaySpace;
    line: THREE.Line;
    raycaster: THREE.Raycaster;
    connected: boolean;
    select: () => void;
  }[] = [];
  private rotation = new THREE.Matrix4();
  constructor(
    renderer: THREE.WebGLRenderer,
    rig: THREE.Group,
    private interactions: InteractionManager,
  ) {
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, -1),
      ]);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: "#a8c8a3" }),
      );
      line.scale.z = 5;
      line.visible = false;
      controller.add(line);
      rig.add(controller);
      const data = {
        controller,
        line,
        raycaster: new THREE.Raycaster(),
        connected: false,
        select: () => {},
      };
      data.select = () => {
        if (!data.connected) return;
        this.updateRay(data);
        const hit = this.interactions.hit(data.raycaster);
        if (hit) this.interactions.activate(hit.entry.id);
      };
      controller.addEventListener("select", data.select);
      controller.addEventListener("connected", () => {
        data.connected = true;
        line.visible = true;
      });
      controller.addEventListener("disconnected", () => {
        data.connected = false;
        line.visible = false;
        this.interactions.hover(`xr-${i}`, null);
      });
      this.controllers.push(data);
    }
  }
  private updateRay(data: (typeof this.controllers)[number]): void {
    data.controller.updateWorldMatrix(true, false);
    this.rotation.extractRotation(data.controller.matrixWorld);
    data.raycaster.ray.origin.setFromMatrixPosition(
      data.controller.matrixWorld,
    );
    data.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.rotation);
  }
  update(): void {
    for (let i = 0; i < this.controllers.length; i++) {
      const data = this.controllers[i];
      if (!data.connected) continue;
      this.updateRay(data);
      const hit = this.interactions.hit(data.raycaster);
      data.line.scale.z = hit?.distance ?? 5;
      (data.line.material as THREE.LineBasicMaterial).color.set(
        hit ? "#f2c97e" : "#a8c8a3",
      );
      this.interactions.hover(`xr-${i}`, hit?.entry ?? null);
    }
  }
  dispose(): void {
    for (const data of this.controllers) {
      data.controller.removeEventListener("select", data.select);
      data.line.geometry.dispose();
      (data.line.material as THREE.Material).dispose();
      data.controller.removeFromParent();
    }
  }
}
