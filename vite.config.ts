import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import neon from "./neon-vite-plugin.ts";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		netlify(),
		neon,
		tailwindcss(),
		tanstackStart({
			server: {
				// Enable streaming SSR and static prerendering
				stream: true,
				prerender: {
					routes: ['/', '/auth/sign-in'],
					crawlLinks: true,
				},
			},
		}),
		viteReact(),
	],
});

export default config;
