import type { ScenarioSnapshot } from "../scenarios/ScenarioManager";
import { translate, type Locale, type Message } from "../i18n/messages";
export type Mode = "desktop" | "vr";
export interface ButtonSpec {
  id: string;
  label: string;
  secondary?: boolean;
}
export interface ScreenContent {
  eyebrow: string;
  title: string;
  body: string;
  buttons: ButtonSpec[];
  detail?: string;
}
export const reminder =
  "People living with dementia have diverse experiences. This exercise demonstrates selected challenges and cannot recreate the experience of living with dementia.";
export const reflectionQuestions = [
  "How did the interruption affect your ability to complete the task?",
  "How did background distractions influence your concentration?",
  "How could a care worker support someone experiencing similar challenges?",
] as const;
type SourceContent = Omit<
  ScreenContent,
  "eyebrow" | "title" | "body" | "detail" | "buttons"
> & {
  eyebrow: Message;
  title: Message;
  body: Message;
  detail?: Message;
  buttons: (Omit<ButtonSpec, "label"> & { label: Message })[];
};
function sourceContent(
  s: Readonly<ScenarioSnapshot>,
  mode: Mode,
): SourceContent {
  switch (s.state) {
    case "welcome":
      return {
        eyebrow: "A MOMENT TO UNDERSTAND",
        title: "A Different Perspective",
        body: "An Interactive Dementia Awareness Experience",
        buttons: [],
      };
    case "intro":
      return {
        eyebrow: "01 / BEFORE YOU BEGIN",
        title: "A familiar task.\nA fresh perspective.",
        body: "You are about to complete a familiar everyday activity. During the experience, you may encounter interruptions and distractions that make the task more challenging.",
        detail:
          "This is a space to notice, reflect, and learn. There is no timer or score. You can turn off sound or stop at any point.",
        buttons: [{ id: "continue", label: "Show me the controls" }],
      };
    case "tutorial":
      return {
        eyebrow: "02 / GET COMFORTABLE",
        title: "Take it at your own pace.",
        body:
          mode === "vr"
            ? "Look around naturally. Aim with either controller and press the trigger to select a cup or plate. Then aim at its highlighted place on the table and press the trigger again."
            : "Drag the kitchen view to look around. Click an object to select it, then click its highlighted place on the table. No walking or keyboard navigation needed.",
        detail:
          mode === "vr"
            ? "Stay seated or standing in one place. All actions work at a distance. The panel has Sound, Restart, and Stop controls throughout."
            : "You can also use the on-screen Select and Place buttons with Tab and Enter. Arrow keys look around; Home restores your view. Escape stops the experience.",
        buttons: [{ id: "begin", label: "Enter the kitchen" }],
      };
    case "familiarization":
      return {
        eyebrow: "01 / PREPARING BREAKFAST",
        title: "Let’s set the table.",
        body: "Prepare the table for breakfast. Place a cup and a plate on the dining table.",
        detail:
          "Take a moment to look around. Start by selecting the sage-green cup on the counter.",
        buttons: [],
      };
    case "place-cup":
      return {
        eyebrow: "01 / PREPARING BREAKFAST",
        title: s.selected ? "A place for your cup." : "First, the cup.",
        body: s.selected
          ? "Your cup is selected. Choose the highlighted circle on the dining table to place it."
          : "Select the sage-green cup beside the coffee maker.",
        detail: s.selected
          ? "Select the cup again to put it down without moving it."
          : "There is no rush. A single click or trigger press selects it.",
        buttons: [],
      };
    case "interruption": {
      if (s.interruptionPhase === "ringing")
        return {
          eyebrow: "02 / A SMALL INTERRUPTION",
          title: "A moment’s interruption.",
          body: "Someone is calling from the next room.",
          detail: "A phone rings softly. You can stay where you are.",
          buttons: [],
        };
      if (s.interruptionPhase === "question")
        return {
          eyebrow: "02 / PICKING UP THE THREAD",
          title: "What were you doing?",
          body: "Take a moment to reconnect with your task. Choose what comes to mind.",
          buttons: [
            { id: "answer:breakfast", label: "Preparing breakfast" },
            {
              id: "answer:cleaning",
              label: "Cleaning the kitchen",
              secondary: true,
            },
            { id: "answer:keys", label: "Looking for keys", secondary: true },
          ],
        };
      return {
        eyebrow: "02 / PICKING UP THE THREAD",
        title: "Let’s return to breakfast.",
        body:
          s.answer === "breakfast"
            ? "Yes, you were preparing breakfast. Your cup is already on the table."
            : "Thank you for pausing to reflect. You were preparing breakfast, and your cup is already on the table.",
        detail:
          "A calm reminder can help someone return to a task after an interruption.",
        buttons: [{ id: "return-task", label: "Continue with breakfast" }],
      };
    }
    case "place-plate":
      return {
        eyebrow: "03 / ONE THING AT A TIME",
        title: s.selected ? "Finish your place setting." : "Now, the plate.",
        body: s.selected
          ? "Choose the highlighted place on the table to set down your plate."
          : "Your cup is in place. Select the cream-colored plate on the right-hand counter, then place it on the table.",
        detail:
          "Notice where your attention goes. You can adjust or switch off background sounds at any time.",
        buttons: [],
      };
    case "completed":
      return {
        eyebrow: "04 / A MOMENT TO REFLECT",
        title: "Task completed.",
        body: "The table is ready for breakfast. Take a breath and consider what you noticed along the way.",
        detail:
          "The purpose is understanding, not performance. Everyone’s experience will be different.",
        buttons: [{ id: "reflect", label: "Continue to reflection" }],
      };
    case "reflection":
      return {
        eyebrow: "04 / THE CONVERSATION CONTINUES",
        title: "What did you notice?",
        body: "Use these prompts for a conversation with your facilitator or a moment of personal reflection.",
        detail: reminder,
        buttons: [
          { id: "restart", label: "Experience again" },
          { id: "stop", label: "Return to welcome", secondary: true },
        ],
      };
  }
}

export function contentFor(
  s: Readonly<ScenarioSnapshot>,
  mode: Mode,
  locale: Locale = "fi",
): ScreenContent {
  const content = sourceContent(s, mode);
  return {
    eyebrow: translate(content.eyebrow, locale),
    title: translate(content.title, locale),
    body: translate(content.body, locale),
    detail: content.detail ? translate(content.detail, locale) : undefined,
    buttons: content.buttons.map((button) => ({
      ...button,
      label: translate(button.label, locale),
    })),
  };
}
