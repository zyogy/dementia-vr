import { Experience } from "./core/Experience";
import "./styles/main.css";
import { browserLocalization } from "./i18n/Localization";

const host = document.querySelector<HTMLElement>("#scene")!;
const localization = browserLocalization();
localization.applyDocument();
let experience: Experience | undefined;
try {
  experience = new Experience(host, localization);
} catch (error) {
  console.error(error);
  const showError = () => {
    const t = localization.text.bind(localization);
    document.querySelector("#app")!.innerHTML =
      `<main class="fatal-error"><button class="language-button" id="error-language">${localization.locale === "fi" ? "English" : "Suomi"}</button><span class="eyebrow">${t("A Different Perspective")}</span><h1>${t("A little help getting started.")}</h1><p>${t("This experience needs WebGL 2. Try a current browser with hardware acceleration enabled, then reload this page.")}</p><button class="button primary" id="reload">${t("Try again")} ↗</button></main>`;
    document
      .querySelector("#reload")
      ?.addEventListener("click", () => location.reload());
    document.querySelector("#error-language")?.addEventListener("click", () => {
      localization.setLocale(localization.locale === "fi" ? "en" : "fi");
      localization.applyDocument();
      showError();
    });
  };
  showError();
}
if (import.meta.hot) import.meta.hot.dispose(() => experience?.dispose());
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) experience?.dispose();
});
