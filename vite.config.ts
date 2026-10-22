import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

// Use a locally trusted certificate for headset testing over your LAN.
const cert = process.env.VITE_HTTPS_CERT;
const key = process.env.VITE_HTTPS_KEY;
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "publish-license-notices",
      generateBundle() {
        for (const name of ["LICENSE", "THIRD_PARTY_NOTICES.txt"]) {
          this.emitFile({
            type: "asset",
            fileName: name === "LICENSE" ? "LICENSE.txt" : name,
            source: readFileSync(new URL(name, import.meta.url), "utf8"),
          });
        }
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    https:
      cert && key
        ? { cert: readFileSync(cert), key: readFileSync(key) }
        : undefined,
  },
  build: {
    target: "es2022",
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});
