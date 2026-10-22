import { describe, expect, it } from "vitest";
import { Localization } from "../src/i18n/Localization";
import { finnish, translate, type Message } from "../src/i18n/messages";
import { contentFor, reflectionQuestions, reminder } from "../src/ui/content";
import type {
  ScenarioSnapshot,
  ScenarioState,
} from "../src/scenarios/ScenarioManager";

describe("Finnish and English localization", () => {
  it("defaults to Finnish and restores an explicit English choice", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    const locale = new Localization(storage);
    expect(locale.locale).toBe("fi");
    locale.setLocale("en");
    expect(new Localization(storage).locale).toBe("en");
    locale.setLocale("fi");
    expect(new Localization(storage).locale).toBe("fi");
    data.set("adp.locale", "unsupported");
    expect(new Localization(storage).locale).toBe("fi");
  });
  it("works when browser storage is blocked", () => {
    const locale = new Localization({
      getItem: () => {
        throw new Error("Blocked");
      },
      setItem: () => {
        throw new Error("Blocked");
      },
    });
    expect(locale.locale).toBe("fi");
    expect(() => locale.setLocale("en")).not.toThrow();
    expect(locale.text("Select cup")).toBe("Select cup");
  });
  it("translates every screen variant without changing its action IDs or snapshot", () => {
    const states: ScenarioState[] = [
      "welcome",
      "intro",
      "tutorial",
      "familiarization",
      "place-cup",
      "interruption",
      "place-plate",
      "completed",
      "reflection",
    ];
    for (const state of states)
      for (const selected of [null, "cup", "plate"] as const)
        for (const interruptionPhase of [
          "ringing",
          "question",
          "acknowledged",
        ] as const)
          for (const answer of [null, "breakfast", "keys"])
            for (const mode of ["desktop", "vr"] as const) {
              const snapshot: ScenarioSnapshot = {
                state,
                selected,
                interruptionPhase,
                answer,
                cupPlaced: true,
                platePlaced: false,
              };
              const original = { ...snapshot };
              const fi = contentFor(snapshot, mode),
                en = contentFor(snapshot, mode, "en");
              for (const field of ["eyebrow", "title", "body"] as const) {
                expect(fi[field]).toBeTruthy();
                expect(fi[field]).not.toBe(en[field]);
              }
              expect(fi.buttons.map((b) => b.id)).toEqual(
                en.buttons.map((b) => b.id),
              );
              fi.buttons.forEach((button, i) =>
                expect(button.label).not.toBe(en.buttons[i].label),
              );
              expect(snapshot).toEqual(original);
            }
  });
  it("covers reflection, educational scope, and all registered messages", () => {
    for (const key of Object.keys(finnish) as Message[]) {
      expect(translate(key, "fi").trim().length).toBeGreaterThan(0);
      expect(translate(key, "en")).toBe(key);
    }
    expect(reflectionQuestions.map((q) => translate(q, "fi"))).toHaveLength(3);
    expect(translate(reminder, "fi")).toContain("eikä se voi jäljitellä");
  });
});
