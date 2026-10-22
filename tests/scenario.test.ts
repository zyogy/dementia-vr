import { describe, expect, it } from "vitest";
import { ScenarioManager } from "../src/scenarios/ScenarioManager";
import {
  defaultSimulationConfig,
  sanitizeConfig,
} from "../src/simulation/SimulationConfig";

function begin(interruptions = true) {
  const scenario = new ScenarioManager({
    ...defaultSimulationConfig,
    taskInterruptions: interruptions,
  });
  scenario.action("start");
  scenario.action("continue");
  scenario.action("begin");
  return scenario;
}

describe("Breakfast scenario", () => {
  it("requires introduction and tutorial before enabling task objects", () => {
    const s = new ScenarioManager(defaultSimulationConfig);
    expect(s.snapshot.state).toBe("welcome");
    expect(s.select("cup")).toBe(false);
    s.action("begin");
    expect(s.snapshot.state).toBe("welcome");
    s.action("start");
    expect(s.snapshot.state).toBe("intro");
    s.action("continue");
    expect(s.snapshot.state).toBe("tutorial");
    expect(s.select("cup")).toBe(false);
    s.action("begin");
    expect(s.snapshot.state).toBe("familiarization");
  });
  it("finishes both objects, interruption, acknowledgement, and reflection", () => {
    const s = begin();
    expect(s.select("cup")).toBe(true);
    expect(s.snapshot.state).toBe("place-cup");
    expect(s.place("cup")).toBe(true);
    expect(s.snapshot.cupPlaced).toBe(true);
    expect(s.snapshot.state).toBe("interruption");
    expect(s.snapshot.interruptionPhase).toBe("ringing");
    expect(s.select("plate")).toBe(false);
    s.answerInterruption("breakfast");
    expect(s.snapshot.answer).toBeNull();
    s.interruptionEnded();
    expect(s.snapshot.interruptionPhase).toBe("question");
    s.answerInterruption("breakfast");
    expect(s.snapshot.interruptionPhase).toBe("acknowledged");
    s.action("return-task");
    expect(s.snapshot.state).toBe("place-plate");
    expect(s.select("plate")).toBe(true);
    expect(s.place("plate")).toBe(true);
    expect(s.snapshot).toMatchObject({
      state: "completed",
      cupPlaced: true,
      platePlaced: true,
      selected: null,
    });
    s.action("reflect");
    expect(s.snapshot.state).toBe("reflection");
  });
  it.each(["cleaning", "keys"])(
    "allows supportive continuation for answer %s",
    (answer) => {
      const s = begin();
      s.select("cup");
      s.place("cup");
      s.interruptionEnded();
      s.answerInterruption(answer);
      expect(s.snapshot.answer).toBe(answer);
      s.action("return-task");
      expect(s.snapshot.state).toBe("place-plate");
      s.select("plate");
      s.place("plate");
      expect(s.snapshot.state).toBe("completed");
    },
  );
  it("rejects premature placements, wrong targets, and duplicate actions", () => {
    const s = begin();
    expect(s.place("cup")).toBe(false);
    expect(s.select("plate")).toBe(false);
    s.select("cup");
    expect(s.place("plate")).toBe(false);
    s.place("cup");
    expect(s.place("cup")).toBe(false);
    s.action("reflect");
    s.action("return-task");
    expect(s.snapshot.state).toBe("interruption");
    s.interruptionEnded();
    s.answerInterruption("unexpected");
    expect(s.snapshot.interruptionPhase).toBe("question");
  });
  it("supports selection cancellation without changing object placement", () => {
    const s = begin();
    s.select("cup");
    s.select("cup");
    expect(s.snapshot.selected).toBeNull();
    expect(s.snapshot.cupPlaced).toBe(false);
    expect(s.place("cup")).toBe(false);
    s.select("cup");
    expect(s.place("cup")).toBe(true);
  });
  it("honors the interruption configuration and still requires both objects", () => {
    const s = begin(false);
    s.select("cup");
    s.place("cup");
    expect(s.snapshot.state).toBe("place-plate");
    expect(s.snapshot.platePlaced).toBe(false);
    s.select("plate");
    s.place("plate");
    expect(s.snapshot.state).toBe("completed");
  });
  it("can disable a pending interruption without becoming stuck", () => {
    const s = begin();
    s.select("cup");
    s.place("cup");
    s.configure({ ...defaultSimulationConfig, taskInterruptions: false });
    expect(s.snapshot.state).toBe("place-plate");
    s.interruptionEnded();
    expect(s.snapshot.state).toBe("place-plate");
  });
  it("reset clears task progress and ignores stale interruption callbacks", () => {
    const s = begin();
    s.select("cup");
    s.place("cup");
    s.action("restart");
    s.interruptionEnded();
    expect(s.snapshot).toMatchObject({
      state: "intro",
      cupPlaced: false,
      platePlaced: false,
      selected: null,
      answer: null,
    });
    s.action("stop");
    s.answerInterruption("keys");
    expect(s.snapshot.state).toBe("welcome");
  });
  it("unsubscribes listeners and exposes snapshots without mutable internal state", () => {
    const s = begin();
    const events: string[] = [];
    const unsubscribe = s.subscribe((snapshot) => events.push(snapshot.state));
    s.select("cup");
    unsubscribe();
    s.place("cup");
    expect(events).toEqual(["familiarization", "place-cup"]);
    const snapshot = { ...s.snapshot };
    snapshot.cupPlaced = false;
    expect(s.snapshot.cupPlaced).toBe(true);
  });
  it("clamps audio intensity, including invalid values", () => {
    expect(
      sanitizeConfig({ ...defaultSimulationConfig, audioIntensity: 4 })
        .audioIntensity,
    ).toBe(1);
    expect(
      sanitizeConfig({ ...defaultSimulationConfig, audioIntensity: -1 })
        .audioIntensity,
    ).toBe(0);
    expect(
      sanitizeConfig({ ...defaultSimulationConfig, audioIntensity: NaN })
        .audioIntensity,
    ).toBe(0.3);
  });
});
