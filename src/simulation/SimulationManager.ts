import { AudioManager } from "./AudioManager";
import type { SimulationConfig } from "./SimulationConfig";

export interface VisualEffect {
  id: string;
  enable(): void;
  disable(): void;
  dispose(): void;
}
export type SimulationEvent = "interruption-ended";
export class SimulationManager {
  readonly audio = new AudioManager();
  private timeout?: ReturnType<typeof setTimeout>;
  private listeners = new Set<(event: SimulationEvent) => void>();
  private effects = new Map<string, VisualEffect>();
  constructor(private config: SimulationConfig) {
    this.configure(config);
  }
  configure(config: SimulationConfig): void {
    this.config = config;
    this.audio.configure(config.audioDistractions, config.audioIntensity);
    if (!config.enableVisualEffects)
      this.effects.forEach((effect) => effect.disable());
  }
  subscribe(listener: (event: SimulationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  registerVisualEffect(effect: VisualEffect): void {
    this.effects.set(effect.id, effect);
  }
  enableVisualEffect(id: string): void {
    if (this.config.enableVisualEffects) this.effects.get(id)?.enable();
  }
  triggerInterruption(): void {
    this.reset();
    this.audio.ring();
    this.timeout = setTimeout(() => {
      this.timeout = undefined;
      this.audio.stop();
      this.listeners.forEach((listener) => listener("interruption-ended"));
    }, 4800);
  }
  enableAudioDistraction(): void {
    this.audio.distractions();
  }
  disableAudioDistraction(): void {
    this.audio.stop();
  }
  reset(): void {
    clearTimeout(this.timeout);
    this.timeout = undefined;
    this.audio.stop();
    this.effects.forEach((effect) => effect.disable());
  }
  dispose(): void {
    this.reset();
    this.audio.dispose();
    this.listeners.clear();
    this.effects.forEach((effect) => effect.dispose());
  }
}
