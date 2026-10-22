import { translate, type Locale, type Message } from "./messages";

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
const preferenceKey = "adp.locale";

/** Explicit preferences persist; new visitors always start in Finnish. */
export class Localization {
  locale: Locale = "fi";
  constructor(private storage?: PreferenceStorage) {
    try {
      if (storage?.getItem(preferenceKey) === "en") this.locale = "en";
    } catch {
      /* Storage may be unavailable in private/restricted browsing. */
    }
  }
  text(message: Message): string {
    return translate(message, this.locale);
  }
  setLocale(locale: Locale): void {
    this.locale = locale;
    try {
      this.storage?.setItem(preferenceKey, locale);
    } catch {
      /* Keep the session usable. */
    }
  }
  applyDocument(): void {
    document.documentElement.lang = this.locale;
    document.title = this.text("A Different Perspective — Dementia Awareness");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        this.text(
          "A calm, interactive dementia-awareness training experience for desktop and virtual reality.",
        ),
      );
  }
}

export function browserLocalization(): Localization {
  try {
    return new Localization(window.localStorage);
  } catch {
    return new Localization();
  }
}
