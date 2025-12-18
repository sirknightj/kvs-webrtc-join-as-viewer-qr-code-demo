import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  base: command === 'build' ? "/kvs-webrtc-join-as-viewer-qr-code-demo/" : "/",
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
}));
