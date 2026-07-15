import { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import type { SkeletonResult, ResponsiveBones } from './types.js';
/**
 * Register pre-generated bones so `<Skeleton name="...">` can auto-resolve them.
 *
 * Called by the generated `registry.js` file (created by `npx boneyard-js build`).
 * Import it once in your app entry point:
 *
 * ```ts
 * import './bones/registry'
 * ```
 */
export declare function registerBones(map: Record<string, SkeletonResult | ResponsiveBones>): void;
export interface SkeletonProps {
    /** When true, shows the skeleton. When false, shows children. */
    loading: boolean;
    /** Your component — rendered when not loading. */
    children: ReactNode;
    /**
     * Name this skeleton. Used to auto-resolve pre-generated bones from the registry.
     */
    name?: string;
    /**
     * Pre-generated bones. Accepts a single `SkeletonResult` or a `ResponsiveBones` map.
     */
    initialBones?: SkeletonResult | ResponsiveBones;
    /** Bone color (default: '#d4d4d4') */
    color?: string;
    /** Bone color for dark mode (default: '#3a3a3c') */
    darkColor?: string;
    /**
     * Force dark mode on/off. When omitted, uses the system color scheme.
     * Set to `false` explicitly if your app has a light background regardless
     * of the system theme.
     */
    dark?: boolean;
    /** Enable pulse animation (default: true) */
    animate?: boolean;
    /** Additional style for the container */
    style?: ViewStyle;
    /**
     * Shown when loading is true and no bones are available.
     */
    fallback?: ReactNode;
}
/**
 * React Native skeleton loading component.
 *
 * Renders pixel-perfect skeleton loading screens using pre-generated bone
 * positions from `npx boneyard-js build`.
 *
 * @example
 * ```tsx
 * import { Skeleton } from 'boneyard-js/native'
 * import dashboardBones from './bones/dashboard.bones.json'
 *
 * <Skeleton name="dashboard" loading={isLoading} initialBones={dashboardBones}>
 *   <DashboardUI />
 * </Skeleton>
 * ```
 */
export declare function Skeleton({ loading, children, name, initialBones, color, darkColor, dark, animate, style, fallback, }: SkeletonProps): import("react/jsx-runtime").JSX.Element;
