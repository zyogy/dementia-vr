import * as THREE from "three";
import { ControllerManager } from "./ControllerManager";
import type { InteractionManager } from "../interaction/InteractionManager";
import type { Message } from "../i18n/messages";

export class XRManager {
  readonly rig = new THREE.Group();
  readonly controllers: ControllerManager;
  private started = false;
  private endListener = () => {
    this.started = false;
    this.rig.position.set(0, 0, 0);
    this.onSession(false);
  };
  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    interactions: InteractionManager,
    private onSession: (active: boolean) => void,
  ) {
    scene.add(this.rig);
    this.rig.add(camera);
    renderer.xr.enabled = true;
    // Local reference space begins at the user's head: same comfortable eye height seated or standing.
    renderer.xr.setReferenceSpaceType("local");
    renderer.xr.setFramebufferScaleFactor(0.85);
    this.controllers = new ControllerManager(renderer, this.rig, interactions);
    renderer.xr.addEventListener("sessionend", this.endListener);
  }
  async support(): Promise<{ supported: boolean; reason: Message }> {
    if (!window.isSecureContext)
      return {
        supported: false,
        reason:
          "VR needs HTTPS or localhost. Open a secure address in Meta Quest Browser.",
      };
    if (!navigator.xr)
      return {
        supported: false,
        reason:
          "For immersive VR, open this experience in Meta Quest Browser. Desktop is ready here.",
      };
    try {
      const supported = await navigator.xr.isSessionSupported("immersive-vr");
      return {
        supported,
        reason: supported
          ? "Your headset is ready. Use either controller."
          : "No immersive headset detected. You can still explore on desktop.",
      };
    } catch {
      return {
        supported: false,
        reason:
          "VR availability could not be checked. Desktop mode is available.",
      };
    }
  }
  async enter(): Promise<void> {
    if (this.started || this.renderer.xr.isPresenting) return;
    if (!navigator.xr)
      throw new Error("WebXR is not available in this browser.");
    this.started = true;
    let session: XRSession | undefined;
    try {
      // Called directly by a user gesture; no permission check or audio await ahead of this call.
      session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor"],
      });
      this.rig.position.set(0, 1.62, 2.65);
      await this.renderer.xr.setSession(session);
      this.onSession(true);
    } catch (error) {
      this.started = false;
      this.rig.position.set(0, 0, 0);
      if (session) await session.end().catch(() => {});
      throw error;
    }
  }
  async exit(): Promise<void> {
    await this.renderer.xr.getSession()?.end();
  }
  dispose(): void {
    this.renderer.xr.removeEventListener("sessionend", this.endListener);
    this.controllers.dispose();
    void this.exit();
  }
}
