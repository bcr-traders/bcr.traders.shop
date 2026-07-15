import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useState, useEffect, useCallback, } from 'react';
import { View, Animated, Easing, useWindowDimensions, useColorScheme, StyleSheet, } from 'react-native';
import { normalizeBone } from './types.js';
// ── Bones registry ──────────────────────────────────────────────────────────
const bonesRegistry = new Map();
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
export function registerBones(map) {
    for (const [name, bones] of Object.entries(map)) {
        bonesRegistry.set(name, bones);
    }
}
/** Pick the right SkeletonResult from a responsive set for the current width */
function resolveResponsive(bones, width) {
    if (!('breakpoints' in bones))
        return bones;
    const bps = Object.keys(bones.breakpoints).map(Number).sort((a, b) => a - b);
    if (bps.length === 0)
        return null;
    const match = [...bps].reverse().find(bp => width >= bp) ?? bps[0];
    return bones.breakpoints[match] ?? null;
}
/** Hook: pulse animation value 0→1→0 looping at 1.8s total */
function usePulseAnimation(enabled) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!enabled) {
            anim.setValue(0);
            return;
        }
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(anim, {
                toValue: 1,
                duration: 900,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false,
            }),
            Animated.timing(anim, {
                toValue: 0,
                duration: 900,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false,
            }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [enabled, anim]);
    return anim;
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
export function Skeleton({ loading, children, name, initialBones, color, darkColor, dark, animate = true, style, fallback, }) {
    const systemScheme = useColorScheme();
    // If `dark` prop is provided, use it. Otherwise fall back to system scheme.
    const isDark = dark ?? systemScheme === 'dark';
    const [containerWidth, setContainerWidth] = useState(0);
    // Colors that match the boneyard web demo appearance:
    // Regular bones: visible but soft grey
    // Container bones (c:true): lighter than regular so child bones stand out
    const boneColor = isDark
        ? (darkColor ?? '#3a3a3c')
        : (color ?? '#d4d4d4');
    const bonePulseColor = isDark ? '#4a4a4c' : '#e4e4e4';
    const containerColor = isDark ? '#2c2c2e' : '#e8e8e8';
    const containerPulseColor = isDark ? '#3a3a3c' : '#f0f0f0';
    const pulseAnim = usePulseAnimation(loading && animate);
    const onLayout = useCallback((e) => {
        const { width } = e.nativeEvent.layout;
        setContainerWidth(Math.round(width));
    }, []);
    // Resolve bones: explicit initialBones > registry lookup
    const effectiveBones = initialBones ?? (name ? bonesRegistry.get(name) : undefined);
    const { width: screenWidth } = useWindowDimensions();
    const activeBones = effectiveBones
        ? resolveResponsive(effectiveBones, screenWidth)
        : null;
    const showSkeleton = loading && activeBones;
    const showFallback = loading && !activeBones;
    const boneHeight = activeBones?.height ?? 0;
    return (_jsx(View, { style: [styles.container, style], onLayout: onLayout, children: showSkeleton ? (_jsx(View, { style: { width: '100%', height: boneHeight }, children: activeBones.bones.map((raw, i) => {
                const b = normalizeBone(raw);
                const borderRadius = typeof b.r === 'number'
                    ? b.r
                    : b.r === '50%'
                        ? Math.min(containerWidth > 0 ? (b.w / 100) * containerWidth : b.h, b.h) / 2
                        : (parseFloat(b.r) || 0);
                // Container bones are lighter, regular bones are the base color
                const base = b.c ? containerColor : boneColor;
                const pulse = b.c ? containerPulseColor : bonePulseColor;
                return (_jsx(View, { style: {
                        position: 'absolute',
                        left: `${b.x}%`,
                        top: b.y,
                        width: `${b.w}%`,
                        height: b.h,
                        borderRadius,
                        backgroundColor: base,
                        overflow: 'hidden',
                    }, children: animate && (_jsx(Animated.View, { style: {
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: pulse,
                            opacity: pulseAnim,
                        } })) }, i));
            }) })) : showFallback ? (fallback ?? null) : (children) }));
}
const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
});
