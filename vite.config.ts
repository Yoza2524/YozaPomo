import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  // 代码分割配置
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型依赖分割成单独的 chunk
          "vue-vendor": ["vue", "pinia"],
          "naive-ui": ["naive-ui"],
          "tauri-api": ["@tauri-apps/api"],
        },
      },
    },
    // 提高 chunk 大小警告阈值（naive-ui 本身较大）
    chunkSizeWarningLimit: 600,
  },

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
