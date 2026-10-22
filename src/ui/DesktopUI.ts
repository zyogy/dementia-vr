import { Localization } from "../i18n/Localization";
import type { Message } from "../i18n/messages";
import type { ScenarioSnapshot } from "../scenarios/ScenarioManager";
import type { SimulationConfig } from "../simulation/SimulationConfig";
import {
  contentFor,
  reflectionQuestions,
  reminder,
  type Mode,
} from "./content";

const arrow = '<span aria-hidden="true">↗</span>';
const icons = {
  sound:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
  headset:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16l2 9-3 2h-4l-3-3-3 3H5l-3-2z"/><path d="M7 11v3m10-3v3"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/></svg>',
};

export class DesktopUI {
  private root: HTMLElement;
  private panel: HTMLElement;
  private settings: HTMLDialogElement;
  private snapshot?: Readonly<ScenarioSnapshot>;
  private config: SimulationConfig;
  private mode: Mode = "desktop";
  private xrSupported = false;
  private xrReason: Message = "Checking headset availability…";
  private abort = new AbortController();
  constructor(
    config: SimulationConfig,
    private onAction: (action: string) => void,
    private onConfig: (config: SimulationConfig) => void,
    private localization: Localization,
  ) {
    this.config = config;
    const t = (message: Message) => this.localization.text(message);
    this.root = document.querySelector("#app")!;
    this.root.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#" data-action="stop" aria-label="${t("A Different Perspective, return to welcome")}"><span class="brand-mark" aria-hidden="true">a<span>p</span></span><span>${t("A DIFFERENT\nPERSPECTIVE").replace("\n", "<br>")}</span></a>
        <div class="top-actions"><button class="language-button" data-action="toggle-language" aria-label="${t(this.localization.locale === "fi" ? "Switch to English" : "Switch to Finnish")}" lang="${this.localization.locale === "fi" ? "en" : "fi"}">${this.localization.locale === "fi" ? "English" : "Suomi"}</button><span class="training-label"><i></i> ${t("AWARENESS THROUGH EXPERIENCE")}</span><button class="icon-button" data-action="settings" aria-label="${t("Experience settings")}">${icons.settings}</button><button class="stop-button" data-action="stop" aria-label="${t("Exit experience")}">${t("Exit")} <span aria-hidden="true">↗</span></button></div>
      </header>
      <main id="content"></main>
      <div class="scene-label" aria-hidden="true"><span class="scene-dot"></span> ${t("THE EVERYDAY, SEEN DIFFERENTLY")} <span>${t("01 — THE KITCHEN")}</span></div>
      <div class="hover-label" id="hover-label" aria-hidden="true"></div>
      <div class="scene-tools" aria-label="${t("View controls")}"><span>${t("Drag to look around")}</span><button data-action="reset-view">${t("Reset view")} <span aria-hidden="true">↺</span></button></div>
      <footer class="footer"><span>${t("DESIGNED FOR UNDERSTANDING. BUILT AROUND PEOPLE.")}</span><a href="https://github.com/zyogy/dementia-vr/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" aria-label="${t("License: copyright 2026 zyogy, noncommercial use only")}">© 2026 ZYOGY <span class="footer-dot">•</span> ${t("NONCOMMERCIAL USE ONLY")} ↗</a></footer>
      <div class="toast" role="status" aria-live="polite"></div>
      <dialog class="settings-dialog" aria-labelledby="settings-title">
        <form method="dialog"><div class="dialog-heading"><span class="eyebrow">${t("MAKE YOURSELF COMFORTABLE")}</span><button class="icon-button" aria-label="${t("Close settings")}">×</button></div><h2 id="settings-title">${t("Your experience.")}</h2><p>${t("Adjust these at any time. There is no right level of challenge.")}</p>
          <label class="setting"><span><strong>${t("Background sounds")}</strong><small>${t("Soft ring, ticking, and abstract conversation")}</small></span><input type="checkbox" name="audioDistractions"></label>
          <label class="setting range-setting"><span><strong>${t("Sound intensity")}</strong><small id="volume-value"></small></span><input type="range" min="0" max="1" step="0.05" name="audioIntensity" aria-label="${t("Sound intensity")}"></label>
          <label class="setting"><span><strong>${t("Task interruption")}</strong><small>${t("A short pause and a gentle reminder")}</small></span><input type="checkbox" name="taskInterruptions"></label>
          <label class="setting"><span><strong>${t("Object hints")}</strong><small>${t("Show rings around the next object")}</small></span><input type="checkbox" name="showHints"></label>
          <p class="settings-note">${t("No flashing, distortion, camera shake, or time limits. Placement guides always remain visible.")}</p><button class="button primary" value="close">${t("Back to the experience")} ${arrow}</button>
        </form>
      </dialog>`;
    this.panel = this.root.querySelector("#content")!;
    this.settings = this.root.querySelector("dialog")!;
    this.root.addEventListener(
      "click",
      (event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-action]",
        );
        if (!target) return;
        event.preventDefault();
        if (target.dataset.action === "settings") {
          this.syncSettings();
          this.settings.showModal();
        } else this.onAction(target.dataset.action!);
      },
      { signal: this.abort.signal },
    );
    this.settings.addEventListener(
      "input",
      (event) => {
        const input = event.target as HTMLInputElement;
        const next = { ...this.config };
        if (input.name === "audioIntensity")
          next.audioIntensity = Number(input.value);
        else if (
          input.name === "audioDistractions" ||
          input.name === "taskInterruptions" ||
          input.name === "showHints"
        )
          next[input.name] = input.checked;
        this.onConfig(next);
      },
      { signal: this.abort.signal },
    );
    this.settings.addEventListener(
      "click",
      (event) => {
        if (event.target === this.settings) this.settings.close();
      },
      { signal: this.abort.signal },
    );
  }
  private syncSettings(): void {
    for (const key of [
      "audioDistractions",
      "taskInterruptions",
      "showHints",
    ] as const)
      this.settings.querySelector<HTMLInputElement>(
        `[name="${key}"]`,
      )!.checked = this.config[key];
    (
      this.settings.querySelector('[name="audioIntensity"]') as HTMLInputElement
    ).value = String(this.config.audioIntensity);
    this.settings.querySelector("#volume-value")!.textContent =
      `${Math.round(this.config.audioIntensity * 100)}% · ${this.localization.text("gentle by default")}`;
  }
  setXRSupport(supported: boolean, reason: Message): void {
    this.xrSupported = supported;
    this.xrReason = reason;
    if (this.snapshot?.state === "welcome")
      this.render(this.snapshot, this.mode);
  }
  configure(config: SimulationConfig): void {
    this.config = config;
    this.syncSettings();
    if (this.snapshot) this.render(this.snapshot, this.mode, false);
  }
  setImmersive(active: boolean): void {
    this.root.hidden = active;
    if (active) this.settings.close();
  }
  setHover(label: string): void {
    const element = this.root.querySelector("#hover-label")!;
    element.textContent = label;
    element.classList.toggle("visible", !!label);
  }
  toast(message: Message | ""): void {
    const element = this.root.querySelector(".toast")!;
    element.textContent = message ? this.localization.text(message) : "";
  }
  render(snapshot: Readonly<ScenarioSnapshot>, mode: Mode, focus = true): void {
    const t = (message: Message) => this.localization.text(message);
    const oldState = this.snapshot?.state;
    const oldPhase = this.snapshot?.interruptionPhase;
    const focusedAction = (document.activeElement as HTMLElement | null)
      ?.dataset.action;
    this.snapshot = snapshot;
    this.mode = mode;
    if (oldState !== snapshot.state)
      window.scrollTo({ top: 0, behavior: "instant" });
    const isWelcome = snapshot.state === "welcome";
    const task = ["familiarization", "place-cup", "place-plate"].includes(
      snapshot.state,
    );
    document.body.dataset.screen = isWelcome
      ? "welcome"
      : task
        ? "task"
        : snapshot.state;
    this.root
      .querySelector(".stop-button")!
      .classList.toggle("hidden", isWelcome);
    if (isWelcome) {
      this.panel.innerHTML = `<section class="welcome-panel" aria-labelledby="screen-title">
        <div class="eyebrow"><span class="tiny-line"></span> ${t("A MOMENT TO UNDERSTAND")}</div>
        <h1 id="screen-title" tabindex="-1">${t("A Different")}<br><em>${t("Perspective.")}</em></h1>
        <p class="subtitle">${t("An Interactive Dementia\nAwareness Experience").replace("\n", "<br>")}</p>
        <p class="welcome-description">${t("Step into a familiar kitchen. Explore how small interruptions can change an everyday task—and open a conversation about more thoughtful care.")}</p>
        <div class="welcome-actions"><button class="button primary" data-action="start-desktop">${t("Start on Desktop")} ${arrow}</button><button class="button secondary" data-action="start-vr" ${this.xrSupported ? "" : 'aria-disabled="true"'}>${icons.headset} ${t("Enter VR")} ${arrow}</button></div>
        <p class="device-note" id="xr-status">${t(this.xrReason)}</p>
        <div class="welcome-meta"><span><i class="meta-symbol">◷</i> ${t("At your own pace")}</span><span><i class="meta-symbol">◇</i> ${t("Seated or standing")}</span></div>
        <div class="disclaimer"><span aria-hidden="true">i</span><p>${t("An invitation to understand, not a recreation of dementia. This educational exercise explores selected challenges; every person’s experience is different.")}</p></div>
      </section><aside class="hero-caption"><span class="caption-index">01</span><div><span class="eyebrow">${t("THE BREAKFAST SCENARIO")}</span><h2>${t("Small tasks.\nMeaningful insights.").replace("\n", "<br>")}</h2></div><span class="caption-arrow" aria-hidden="true">↗</span></aside>`;
      return;
    }
    const content = contentFor(snapshot, mode, this.localization.locale);
    const step =
      snapshot.state === "interruption"
        ? 1
        : snapshot.state === "place-plate"
          ? 2
          : ["completed", "reflection"].includes(snapshot.state)
            ? 3
            : 0;
    const progress = `<nav class="progress" aria-label="${t("Scenario progress")}">${(
      [
        "Set the table",
        this.config.taskInterruptions ? "Interruption" : "Pause off",
        "Finish breakfast",
        "Reflect",
      ] as Message[]
    )
      .map((label, i) => {
        const skipped = i === 1 && !this.config.taskInterruptions;
        return `<span class="${i === step ? "current" : i < step && !skipped ? "done" : ""}" ${i === step ? 'aria-current="step"' : ""}><b>${skipped ? "–" : i < step ? "✓" : `0${i + 1}`}</b>${t(label)}</span>`;
      })
      .join("")}</nav>`;
    const actions = content.buttons
      .map(
        (button) =>
          `<button class="button ${button.secondary ? "secondary" : "primary"}" data-action="${button.id}">${button.label}${arrow}</button>`,
      )
      .join("");
    let assist = "";
    if (task) {
      const id = snapshot.state === "place-plate" ? "plate" : "cup";
      assist = `<div class="task-checks"><span class="${snapshot.cupPlaced ? "checked" : ""}"><i>${snapshot.cupPlaced ? "✓" : "1"}</i> ${t("Cup on the table")}</span><span><i>2</i> ${t("Plate on the table")}</span></div><div class="accessible-action"><button class="button secondary" data-action="${snapshot.selected ? `place:${id}` : `select:${id}`}">${t(snapshot.selected ? (id === "cup" ? "Place cup on table" : "Place plate on table") : id === "cup" ? "Select cup" : "Select plate")} ${arrow}</button><small>${t("Click the object in the kitchen, or use this button.")}</small></div>`;
    }
    const reflection =
      snapshot.state === "reflection"
        ? `<ol class="reflection-questions">${reflectionQuestions.map((question, i) => `<li><span>0${i + 1}</span><p>${t(question)}</p></li>`).join("")}</ol><div class="care-note"><strong>${t("A thought to take into practice")}</strong><p>${t("Offer one step at a time. Reduce competing distractions. Give time, reassurance, and a calm reminder—guided by the person’s preferences.")}</p></div>`
        : "";
    const introReminder =
      snapshot.state === "intro"
        ? `<div class="gentle-note">${t(reminder)}</div>`
        : "";
    const caption =
      snapshot.state === "interruption" &&
      snapshot.interruptionPhase === "ringing"
        ? `<div class="sound-caption"><span aria-hidden="true">♪</span> ${t("[A phone rings softly]")}</div>`
        : snapshot.state === "place-plate"
          ? `<div class="sound-caption">${icons.sound}<span>${t(this.config.audioDistractions && this.config.audioIntensity > 0 ? "Soft ticking · distant murmurs · kitchen sounds" : "Background sounds are off")}</span></div>`
          : "";
    this.panel.innerHTML = `${progress}<section class="experience-panel ${task ? "task-panel" : ""} ${snapshot.state === "reflection" ? "reflection-panel" : ""}" aria-labelledby="screen-title"><div class="eyebrow">${content.eyebrow}</div><h1 id="screen-title" tabindex="-1">${content.title.replace("\n", "<br>")}</h1><p class="panel-body">${content.body}</p>${reflection}${content.detail ? `<p class="panel-detail">${content.detail}</p>` : ""}${introReminder}${caption}${assist}<div class="panel-actions">${actions}</div><div class="panel-bottom"><button class="text-button" data-action="toggle-sound">${icons.sound} ${t(this.config.audioDistractions ? "Sound on" : "Sound off")}</button><button class="text-button" data-action="restart">${t("Restart")} ↺</button></div></section>`;
    if (
      focus &&
      (oldState !== snapshot.state || oldPhase !== snapshot.interruptionPhase)
    )
      this.panel
        .querySelector<HTMLElement>("#screen-title")
        ?.focus({ preventScroll: true });
    else if (focusedAction) {
      const same = this.panel.querySelector<HTMLElement>(
        `[data-action="${focusedAction}"]`,
      );
      const next = focusedAction.startsWith("select:")
        ? this.panel.querySelector<HTMLElement>(".accessible-action button")
        : null;
      (same ?? next)?.focus({ preventScroll: true });
    }
  }
  dispose(): void {
    this.abort.abort();
    this.root.replaceChildren();
  }
}
