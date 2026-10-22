import * as THREE from "three";
import type { InteractionManager } from "../interaction/InteractionManager";
import type { ScenarioSnapshot } from "../scenarios/ScenarioManager";
import type { SimulationConfig } from "../simulation/SimulationConfig";
import { contentFor, reflectionQuestions, type ButtonSpec } from "./content";
import { translate, type Locale, type Message } from "../i18n/messages";

interface DrawButton extends ButtonSpec {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** All essential text and controls are drawn into world-space canvas textures. */
export class VRUI {
  readonly root = new THREE.Group();
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private panel: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private unregister: (() => void)[] = [];
  private buttonMeshes: THREE.Mesh[] = [];
  private drawButtons: DrawButton[] = [];
  private hovered = new Set<string>();
  private snapshot?: Readonly<ScenarioSnapshot>;
  private config?: SimulationConfig;
  private locale: Locale = "fi";
  constructor(
    scene: THREE.Scene,
    private interactions: InteractionManager,
    private onAction: (action: string) => void,
  ) {
    this.canvas.width = 1024;
    this.canvas.height = 1200;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = this.createTexture();
    this.panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    this.root.add(this.panel);
    this.root.visible = false;
    scene.add(this.root);
  }
  private createTexture(): THREE.CanvasTexture {
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
  update(
    snapshot: Readonly<ScenarioSnapshot>,
    config: SimulationConfig,
    locale: Locale = "fi",
  ): void {
    this.locale = locale;
    this.unregister.forEach((remove) => remove());
    this.unregister = [];
    this.buttonMeshes.forEach((mesh) => {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.buttonMeshes = [];
    this.hovered.clear();
    this.snapshot = snapshot;
    this.config = config;
    const compact = ["familiarization", "place-cup", "place-plate"].includes(
      snapshot.state,
    );
    const canvasHeight = compact
      ? 580
      : snapshot.state === "reflection"
        ? 1320
        : 1120;
    if (this.canvas.height !== canvasHeight) {
      // WebGL texture storage dimensions are immutable after initial upload.
      // Recreate the GPU texture when moving between full and compact layouts.
      this.canvas.height = canvasHeight;
      this.texture.dispose();
      this.texture = this.createTexture();
      this.panel.material.map = this.texture;
      this.panel.material.needsUpdate = true;
    }
    const width = compact ? 1.9 : 1.65;
    const height = (width * this.canvas.height) / this.canvas.width;
    this.panel.scale.set(width, height, 1);
    this.root.position.set(0, compact ? 2.18 : 1.9, compact ? -1.5 : -0.45);
    this.draw();
    for (const button of this.drawButtons) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(
          (button.w / 1024) * width,
          (button.h / this.canvas.height) * height,
        ),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      mesh.position.set(
        ((button.x + button.w / 2) / 1024 - 0.5) * width,
        (0.5 - (button.y + button.h / 2) / this.canvas.height) * height,
        0.008,
      );
      this.root.add(mesh);
      this.buttonMeshes.push(mesh);
      this.unregister.push(
        this.interactions.register({
          id: `vr:${button.id}`,
          mesh,
          enabled: true,
          label: button.label,
          onSelect: () => this.onAction(button.id),
          onHover: (hovered) => {
            if (hovered) this.hovered.add(button.id);
            else this.hovered.delete(button.id);
            this.draw();
          },
        }),
      );
    }
    this.root.updateMatrixWorld(true);
  }
  private text(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ): number {
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const word of paragraph.split(" ")) {
        if (this.ctx.measureText(line + word).width > maxWidth && line) {
          this.ctx.fillText(line.trim(), x, y);
          y += lineHeight;
          line = "";
        }
        line += `${word} `;
      }
      this.ctx.fillText(line.trim(), x, y);
      y += lineHeight;
    }
    return y;
  }
  private draw(): void {
    if (!this.snapshot || !this.config) return;
    const ctx = this.ctx,
      s = this.snapshot,
      h = this.canvas.height;
    const t = (message: Message) => translate(message, this.locale);
    const content = contentFor(s, "vr", this.locale);
    ctx.fillStyle = "#f4f2e9";
    ctx.fillRect(0, 0, 1024, h);
    ctx.fillStyle = "#516750";
    ctx.fillRect(0, 0, 1024, 10);
    ctx.fillStyle = "#5c6c59";
    ctx.font = "600 23px sans-serif";
    ctx.fillText(content.eyebrow, 52, 65);
    ctx.fillStyle = "#293d32";
    ctx.font = "52px Georgia";
    let y = this.text(content.title, 52, 137, 920, 61);
    ctx.fillStyle = "#394a3d";
    ctx.font = "30px sans-serif";
    y = this.text(content.body, 52, y + 20, 920, 41);
    if (s.state === "reflection") {
      ctx.font = "31px sans-serif";
      reflectionQuestions.forEach((question, i) => {
        y = this.text(`${i + 1}. ${t(question)}`, 52, y + 27, 920, 43);
      });
    }
    const compact = h === 580;
    if (s.state === "familiarization") {
      ctx.fillStyle = "#566153";
      ctx.font = "27px sans-serif";
      this.text(
        t("Start with the sage-green cup on the counter."),
        52,
        y + 20,
        920,
        36,
      );
    }
    if (content.detail && !compact) {
      ctx.fillStyle = "#566153";
      ctx.font = "27px sans-serif";
      y = this.text(content.detail, 52, y + 23, 920, 37);
    }
    if (s.state === "intro") {
      ctx.font = "27px sans-serif";
      y = this.text(
        t(
          "This illustrates selected challenges, not dementia itself. Every person’s experience is different.",
        ),
        52,
        y + 20,
        920,
        36,
      );
    }
    if (s.state === "place-plate") {
      ctx.font = "24px sans-serif";
      ctx.fillStyle = "#566153";
      this.text(
        t(
          this.config.audioDistractions && this.config.audioIntensity > 0
            ? "Sound: soft ticking, abstract murmurs, kitchen tones."
            : "Background sounds are off.",
        ),
        52,
        y + 12,
        920,
        31,
      );
    }
    this.drawButtons = [
      {
        id: "toggle-language",
        label: this.locale === "fi" ? "English" : "Suomi",
        secondary: true,
        x: 770,
        y: 24,
        w: 202,
        h: 60,
      },
    ];
    const buttons = content.buttons;
    // Fixed bottom slots keep controls stable while task text changes.
    let buttonY = h - 126 - buttons.length * 85;
    for (const button of buttons) {
      this.drawButtons.push({ ...button, x: 52, y: buttonY, w: 920, h: 70 });
      buttonY += 85;
    }
    this.drawButtons.push(
      {
        id: "toggle-sound",
        label: t(this.config.audioDistractions ? "Sound on" : "Sound off"),
        secondary: true,
        x: 52,
        y: h - 103,
        w: 290,
        h: 65,
      },
      {
        id: "restart",
        label: t("Restart"),
        secondary: true,
        x: 367,
        y: h - 103,
        w: 290,
        h: 65,
      },
      {
        id: "stop",
        label: t("Stop / exit VR"),
        secondary: true,
        x: 682,
        y: h - 103,
        w: 290,
        h: 65,
      },
    );
    // Reflection already offers restart/stop as primary actions; avoid duplicate registry IDs.
    if (s.state === "reflection")
      this.drawButtons = this.drawButtons.filter(
        (button, index, all) =>
          all.findIndex((other) => other.id === button.id) === index,
      );
    for (const button of this.drawButtons) {
      ctx.fillStyle = this.hovered.has(button.id)
        ? "#d8b97e"
        : button.secondary
          ? "#e2e5d9"
          : "#516750";
      ctx.beginPath();
      ctx.roundRect(button.x, button.y, button.w, button.h, 12);
      ctx.fill();
      ctx.fillStyle =
        button.secondary || this.hovered.has(button.id) ? "#293d32" : "#ffffff";
      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        button.label,
        button.x + button.w / 2,
        button.y + button.h / 2 + 10,
      );
      ctx.textAlign = "left";
    }
    this.texture.needsUpdate = true;
  }
  dispose(): void {
    this.unregister.forEach((remove) => remove());
    this.buttonMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.panel.geometry.dispose();
    this.panel.material.dispose();
    this.texture.dispose();
    this.root.removeFromParent();
  }
}
