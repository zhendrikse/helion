import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.js"),
      name: "Helion",
      fileName: "my-library",
      formats: ["es"]
    },
    rollupOptions: {
      external: ["three"]
    }
  }
});

