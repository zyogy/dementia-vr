import * as THREE from "three";
import { InteractionManager } from "../interaction/InteractionManager";

export class DesktopControls {
  enabled = false;
  private yaw = 0;
  private pitch = 0.145;
  private down: { x: number; y: number; yaw: number; pitch: number } | null =
    null;
  private dragged = false;
  private pointer = new THREE.Vector2();
  private abort = new AbortController();
  constructor(
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLCanvasElement,
    private interactions: InteractionManager,
    private onHint: (label: string) => void,
  ) {
    const options = { signal: this.abort.signal };
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (!this.enabled || event.button !== 0) return;
        this.down = {
          x: event.clientX,
          y: event.clientY,
          yaw: this.yaw,
          pitch: this.pitch,
        };
        this.dragged = false;
        canvas.setPointerCapture(event.pointerId);
      },
      options,
    );
    canvas.addEventListener(
      "pointermove",
      (event) => {
        if (!this.enabled) return;
        if (this.down) {
          const dx = event.clientX - this.down.x,
            dy = event.clientY - this.down.y;
          if (Math.hypot(dx, dy) > 6) this.dragged = true;
          if (this.dragged) {
            this.yaw = THREE.MathUtils.clamp(
              this.down.yaw - dx * 0.003,
              -1.15,
              1.15,
            );
            this.pitch = THREE.MathUtils.clamp(
              this.down.pitch + dy * 0.003,
              -0.38,
              0.72,
            );
            this.apply();
            this.interactions.hover("mouse", null);
            this.onHint("");
            return;
          }
        }
        const hit = this.raycast(event);
        this.interactions.hover("mouse", hit?.entry ?? null);
        canvas.style.cursor = hit ? "pointer" : "grab";
        this.onHint(hit?.entry.label ?? "");
      },
      options,
    );
    canvas.addEventListener(
      "pointerup",
      (event) => {
        if (this.down && !this.dragged && this.enabled) {
          const hit = this.raycast(event);
          if (hit) this.interactions.activate(hit.entry.id);
        }
        this.down = null;
        if (canvas.hasPointerCapture(event.pointerId))
          canvas.releasePointerCapture(event.pointerId);
      },
      options,
    );
    canvas.addEventListener(
      "pointercancel",
      () => {
        this.down = null;
      },
      options,
    );
    canvas.addEventListener(
      "pointerleave",
      () => {
        this.interactions.hover("mouse", null);
        this.onHint("");
      },
      options,
    );
    window.addEventListener(
      "keydown",
      (event) => {
        if (
          !this.enabled ||
          !(event.target instanceof HTMLElement) ||
          event.target.closest("input, button, select, textarea")
        )
          return;
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        if (event.key === "Home") this.reset();
        else {
          this.yaw = THREE.MathUtils.clamp(
            this.yaw +
              (event.key === "ArrowLeft"
                ? 0.07
                : event.key === "ArrowRight"
                  ? -0.07
                  : 0),
            -1.15,
            1.15,
          );
          this.pitch = THREE.MathUtils.clamp(
            this.pitch +
              (event.key === "ArrowDown"
                ? 0.05
                : event.key === "ArrowUp"
                  ? -0.05
                  : 0),
            -0.38,
            0.72,
          );
          this.apply();
        }
      },
      options,
    );
  }
  private raycast(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.camera.updateMatrixWorld();
    this.interactions.raycaster.setFromCamera(this.pointer, this.camera);
    return this.interactions.hit();
  }
  private apply(): void {
    this.camera.rotation.set(-this.pitch, this.yaw, 0, "YXZ");
    this.camera.updateMatrixWorld();
  }
  reset(): void {
    this.yaw = 0;
    this.pitch = 0.145;
    this.camera.position.set(0, 1.62, 2.65);
    this.apply();
  }
  dispose(): void {
    this.abort.abort();
  }
}
