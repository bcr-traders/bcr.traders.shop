/**
 * Vite plugin for boneyard — auto-captures skeleton bones on HMR updates.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { boneyardPlugin } from 'boneyard-js/vite'
 *
 * export default defineConfig({
 *   plugins: [boneyardPlugin()]
 * })
 * ```
 *
 * Runs the initial capture when the dev server starts, then re-captures
 * automatically when files change. No second terminal needed.
 */
import type { Plugin } from 'vite';
export interface BoneyardPluginOptions {
    /** Output directory for .bones.json files (default: './src/bones' or './bones') */
    out?: string;
    /** Viewport widths to capture (default: [375, 768, 1280]) */
    breakpoints?: number[];
    /** Extra ms to wait after page load (default: 800) */
    wait?: number;
    /** Framework for registry imports (default: auto-detected) */
    framework?: 'react' | 'vue' | 'svelte' | 'preact';
    /** Skip initial capture on server start (default: false) */
    skipInitial?: boolean;
    /** Connect to existing Chrome via debug port instead of launching Playwright (reuses cookies, auth, state) */
    cdp?: number;
    /** Routes to capture skeletons from (default: ['/']). The plugin visits each route at every breakpoint. */
    routes?: string[];
    /** Verbose per-step logging — useful when capture returns nothing and you need to see why */
    debug?: boolean;
}
export declare function boneyardPlugin(options?: BoneyardPluginOptions): Plugin;
