import path from 'node:path'
import mkcert from "vite-plugin-mkcert";
import react from '@vitejs/plugin-react-swc'
import tailwindcss from "@tailwindcss/vite";

import { defineConfig } from "vite";

import dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV ?? "development";
const envFiles = [
    `.env.${nodeEnv}.local`,
    `.env.${nodeEnv}`,
    ".env.local",
    ".env",
];

for (const file of envFiles) {
    dotenv.config({ path: file, override: true });
}

export default defineConfig({
    plugins: [mkcert(), react(), tailwindcss()],
    optimizeDeps: {
        esbuildOptions: {
            tsconfig: "./tsconfig.app.json",
        },
    },
    resolve: {
        dedupe: ["react", "react-dom"],
        alias: {
            "@": path.resolve(__dirname, "./src"),
            react: path.resolve(__dirname, "./node_modules/react"),
            "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
        },
    },
    build: {
        outDir: "./dist",
        chunkSizeWarningLimit: 2500,
        rollupOptions: {
            external: [],
            output: {
                manualChunks: {
                    "react-vendor": ["react", "react-dom", "react/jsx-runtime"],
                    "ui-libs": [
                        "class-variance-authority",
                        "tailwind-merge",
                        "clsx",
                        "lucide-react",
                    ],
                },
            },
        },
    },
    server: {
        host: "0.0.0.0",
        port: Number.parseInt(
            process.env.VITE_DEVSERVER_PORT ??
                process.env.VITE_PREVIEW_PORT ??
                "4100",
            10
        ),
        open: true,
    },
    preview: {
        host: "0.0.0.0",
        port: Number.parseInt(
            process.env.VITE_DEVSERVER_PORT ??
                process.env.VITE_PREVIEW_PORT ??
                "4100",
            10
        ),
        strictPort: true,
        open: true,
    },
});
