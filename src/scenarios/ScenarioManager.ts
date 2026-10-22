import type { SimulationConfig } from "../simulation/SimulationConfig";

export type ScenarioState =
  | "welcome"
  | "intro"
  | "tutorial"
  | "familiarization"
  | "place-cup"
  | "interruption"
  | "place-plate"
  | "completed"
  | "reflection";
export type ItemId = "cup" | "plate";
export type InterruptionPhase = "ringing" | "question" | "acknowledged";
export type ScenarioAction =
  | "start"
  | "continue"
  | "begin"
  | "reflect"
  | "restart"
  | "stop"
  | "return-task";
export interface ScenarioSnapshot {
  state: ScenarioState;
  selected: ItemId | null;
  cupPlaced: boolean;
  platePlaced: boolean;
  interruptionPhase: InterruptionPhase;
  answer: string | null;
}

/** Pure, deterministic task logic. No DOM, meshes, audio, or timers. */
export class ScenarioManager {
  private data: ScenarioSnapshot = this.initial("welcome");
  private listeners = new Set<(snapshot: Readonly<ScenarioSnapshot>) => void>();
  constructor(private config: SimulationConfig) {}
  private initial(state: ScenarioState): ScenarioSnapshot {
    return {
      state,
      selected: null,
      cupPlaced: false,
      platePlaced: false,
      interruptionPhase: "ringing",
      answer: null,
    };
  }
  get snapshot(): Readonly<ScenarioSnapshot> {
    return { ...this.data };
  }
  subscribe(
    listener: (snapshot: Readonly<ScenarioSnapshot>) => void,
  ): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
  private emit(): void {
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
  configure(config: SimulationConfig): void {
    this.config = config;
    if (!config.taskInterruptions && this.data.state === "interruption") {
      this.data.state = "place-plate";
      this.emit();
    }
  }
  action(action: ScenarioAction): void {
    const state = this.data.state;
    if (action === "stop") this.data = this.initial("welcome");
    else if (action === "restart") this.data = this.initial("intro");
    else if (action === "start" && state === "welcome")
      this.data = this.initial("intro");
    else if (action === "continue" && state === "intro")
      this.data.state = "tutorial";
    else if (action === "begin" && state === "tutorial")
      this.data.state = "familiarization";
    else if (
      action === "return-task" &&
      state === "interruption" &&
      this.data.interruptionPhase === "acknowledged"
    )
      this.data.state = "place-plate";
    else if (action === "reflect" && state === "completed")
      this.data.state = "reflection";
    else return;
    this.emit();
  }
  canSelect(item: ItemId): boolean {
    return (
      (item === "cup" &&
        ["familiarization", "place-cup"].includes(this.data.state) &&
        !this.data.cupPlaced) ||
      (item === "plate" &&
        this.data.state === "place-plate" &&
        !this.data.platePlaced)
    );
  }
  select(item: ItemId): boolean {
    if (!this.canSelect(item)) return false;
    this.data.selected = this.data.selected === item ? null : item;
    if (item === "cup") this.data.state = "place-cup";
    this.emit();
    return true;
  }
  canPlace(item: ItemId): boolean {
    return this.data.selected === item && this.canSelect(item);
  }
  place(item: ItemId): boolean {
    if (!this.canPlace(item)) return false;
    this.data.selected = null;
    if (item === "cup") {
      this.data.cupPlaced = true;
      this.data.state = this.config.taskInterruptions
        ? "interruption"
        : "place-plate";
    } else {
      this.data.platePlaced = true;
      this.data.state = "completed";
    }
    this.emit();
    return true;
  }
  interruptionEnded(): void {
    if (
      this.data.state !== "interruption" ||
      this.data.interruptionPhase !== "ringing"
    )
      return;
    this.data.interruptionPhase = "question";
    this.emit();
  }
  answerInterruption(answer: string): void {
    if (
      this.data.state !== "interruption" ||
      this.data.interruptionPhase !== "question"
    )
      return;
    if (!["breakfast", "cleaning", "keys"].includes(answer)) return;
    this.data.answer = answer;
    this.data.interruptionPhase = "acknowledged";
    this.emit();
  }
}
