import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/simulation/AudioManager", () => ({
  AudioManager: class {
    configure = vi.fn();
    ring = vi.fn();
    stop = vi.fn();
    distractions = vi.fn();
    dispose = vi.fn();
  },
}));
import { SimulationManager } from "../src/simulation/SimulationManager";
import { defaultSimulationConfig } from "../src/simulation/SimulationConfig";

describe("Simulation lifecycle", () => {
  afterEach(() => vi.useRealTimers());
  it("ends one interruption after its gentle ring, independently of scenario logic", () => {
    vi.useFakeTimers();
    const sim = new SimulationManager(defaultSimulationConfig),
      callback = vi.fn();
    sim.subscribe(callback);
    sim.triggerInterruption();
    expect(sim.audio.ring).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(4799);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledWith("interruption-ended");
    sim.dispose();
  });
  it("cancels pending callbacks and sound on restart, stop, or replacement", () => {
    vi.useFakeTimers();
    const sim = new SimulationManager(defaultSimulationConfig),
      callback = vi.fn();
    sim.subscribe(callback);
    sim.triggerInterruption();
    sim.reset();
    vi.advanceTimersByTime(10000);
    expect(callback).not.toHaveBeenCalled();
    sim.triggerInterruption();
    sim.triggerInterruption();
    vi.advanceTimersByTime(4800);
    expect(callback).toHaveBeenCalledOnce();
    sim.enableAudioDistraction();
    expect(sim.audio.distractions).toHaveBeenCalledOnce();
    sim.dispose();
    expect(sim.audio.dispose).toHaveBeenCalledOnce();
  });
});
