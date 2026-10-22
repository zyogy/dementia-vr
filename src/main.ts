import { Experience } from "./core/Experience";
import "./styles/main.css";

const host = document.querySelector<HTMLElement>("#scene")!;
let experience: Experience | undefined;
try {
  experience = new Experience(host);
} catch (error) {
  console.error(error);
  document.querySelector("#app")!.innerHTML =
    `<main class="fatal-error"><span class="eyebrow">A DIFFERENT PERSPECTIVE</span><h1>A little help getting started.</h1><p>This experience needs WebGL 2. Try a current browser with hardware acceleration enabled, then reload this page.</p><button class="button primary" id="reload">Try again ↗</button></main>`;
  document
    .querySelector("#reload")
    ?.addEventListener("click", () => location.reload());
}
if (import.meta.hot) import.meta.hot.dispose(() => experience?.dispose());
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) experience?.dispose();
});
