/**
 * GCFLoader: animated brand loader for Graduate Christian Fellowship.
 *
 * The "G" ring closes into a full circle, becomes a spinning arc around the
 * navy cross, then reopens into the G. Three thin rings ripple outward.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export type GCFTheme = 'light' | 'dark';

const PALETTE = {
  light: {
    bg: '#F5F5F7',
    scrim: 'rgba(245,245,247,0.88)',
    sky: '#3AA9DC',
    cross: '#0B2265',
    tip: '#A9CFE8',
    text: '#0B2265',
    sub: '#5B6B8C',
  },
  dark: {
    bg: '#0B1530',
    scrim: 'rgba(11,21,48,0.90)',
    sky: '#3AA9DC',
    cross: '#FFFFFF',
    tip: '#A9CFE8',
    text: '#FFFFFF',
    sub: '#9FB0D0',
  },
} as const;

const R = 52;
const SW = 13;
const C = 2 * Math.PI * R;
const REST = 320 / 360;
const SPIN_LEN = 0.25;
const TURNS = 2;
const STAGGER = 0.25 / 2.4;

const easeInOut = (x: number) => {
  'worklet';
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const clamp01 = (x: number) => {
  'worklet';
  return Math.min(1, Math.max(0, x));
};
const seg = (t: number, a: number, b: number) => {
  'worklet';
  return easeInOut(clamp01((t - a) / (b - a)));
};

const arcState = (t: number) => {
  'worklet';
  let L: number;
  let tip: number;
  if (t < 0.28) {
    const close = seg(t, 0.08, 0.28);
    L = REST + (1 - REST) * close;
    tip = 1 - close;
  } else if (t < 0.8) {
    L = 1 - (1 - SPIN_LEN) * seg(t, 0.28, 0.46);
    tip = 0;
  } else {
    const grow = seg(t, 0.8, 0.96);
    L = SPIN_LEN + (REST - SPIN_LEN) * grow;
    tip = grow;
  }
  const x = clamp01((t - 0.28) / 0.68);
  const r = 360 * TURNS * (0.5 - 0.5 * Math.cos(Math.PI * x));
  return { L, r, tip };
};

function useLoop(duration: number): SharedValue<number> {
  const t = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    cancelAnimation(t);
    if (reduceMotion) {
      t.value = 0.55;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [duration, reduceMotion, t]);

  return t;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Colors = (typeof PALETTE)[GCFTheme];

function Ripple({
  t,
  index,
  radius,
  color,
}: {
  t: SharedValue<number>;
  index: number;
  radius: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const p = (((t.value - index * STAGGER) % 1) + 1) % 1;
    const fade = p < 0.15 ? p / 0.15 : (1 - p) / 0.85;
    return { r: radius + p * 8, strokeOpacity: 0.9 * fade };
  });
  return (
    <AnimatedCircle
      cx={100}
      cy={100}
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      animatedProps={props}
    />
  );
}

function GCFMark({ t, size, colors }: { t: SharedValue<number>; size: number; colors: Colors }) {
  const glowProps = useAnimatedProps(() => ({
    fillOpacity: 0.07 + 0.05 * Math.sin(t.value * 2 * Math.PI - Math.PI / 2),
  }));

  const trackProps = useAnimatedProps(() => {
    const { L } = arcState(t.value);
    return { strokeOpacity: clamp01((REST - L) / (REST - SPIN_LEN)) * 0.28 };
  });

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - arcState(t.value).L),
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arcState(t.value).r}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.02 + 0.02 * Math.sin(t.value * 2 * Math.PI - Math.PI / 2) }],
  }));
  const tipProps = useAnimatedProps(() => ({ opacity: arcState(t.value).tip }));

  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
        <AnimatedCircle cx={100} cy={100} r={34} fill={colors.sky} animatedProps={glowProps} />
        <AnimatedCircle
          cx={100}
          cy={100}
          r={R}
          fill="none"
          stroke={colors.sky}
          strokeWidth={SW}
          animatedProps={trackProps}
        />
        {[70, 79, 88].map((radius, i) => (
          <Ripple key={radius} t={t} index={i} radius={radius} color={colors.sky} />
        ))}
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <AnimatedCircle
            cx={100}
            cy={100}
            r={R}
            fill="none"
            stroke={colors.sky}
            strokeWidth={SW}
            strokeDasharray={[C, C]}
            animatedProps={arcProps}
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <AnimatedRect x={122} y={80} width={26} height={11} fill={colors.tip} animatedProps={tipProps} />
          <Rect x={94.5} y={67} width={11} height={68} fill={colors.cross} />
          <Rect x={77.5} y={80} width={44} height={11} fill={colors.cross} />
        </Svg>
      </Animated.View>
    </View>
  );
}

export type GCFLoaderProps = {
  size?: number;
  theme?: GCFTheme;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function GCFLoader({ size = 64, theme = 'light', duration = 2400, style }: GCFLoaderProps) {
  const t = useLoop(duration);
  return (
    <View style={style}>
      <GCFMark t={t} size={size} colors={PALETTE[theme]} />
    </View>
  );
}

function Dot({ t, index, color }: { t: SharedValue<number>; index: number; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t.value * 3 - index * 0.25))),
  }));
  return (
    <Animated.View
      style={[
        {
          width: 5,
          height: 5,
          borderRadius: 2.5,
          marginHorizontal: 2.5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export type GCFSplashProps = {
  theme?: GCFTheme;
  size?: number;
  name?: string;
  caption?: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function GCFSplash({
  theme = 'light',
  size = 170,
  name = 'Graduate Christian Fellowship',
  caption = 'Loading',
  duration = 2400,
  style,
}: GCFSplashProps) {
  const colors = PALETTE[theme];
  const t = useLoop(duration);
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }, style]}>
      <GCFMark t={t} size={size} colors={colors} />
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      <View style={styles.captionRow}>
        <Text style={[styles.caption, { color: colors.sub }]}>{caption}</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <Dot key={i} t={t} index={i} color={colors.sub} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function GCFOverlay({ theme = 'light', size = 88 }: { theme?: GCFTheme; size?: number }) {
  const colors = PALETTE[theme];
  return (
    <View style={[styles.overlay, { backgroundColor: colors.scrim }]} pointerEvents="auto">
      <GCFLoader size={size} theme={theme} />
    </View>
  );
}

type LoadingApi = {
  show: () => void;
  hide: () => void;
  track: <T>(promise: Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingApi | null>(null);

export function GCFLoadingProvider({ children, theme = 'light' }: { children: ReactNode; theme?: GCFTheme }) {
  const [count, setCount] = useState(0);
  const show = useCallback(() => setCount((c) => c + 1), []);
  const hide = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);
  const track = useCallback(
    async <T,>(promise: Promise<T>) => {
      show();
      try {
        return await promise;
      } finally {
        hide();
      }
    },
    [show, hide]
  );
  const api = useMemo(() => ({ show, hide, track }), [show, hide, track]);

  return (
    <LoadingContext.Provider value={api}>
      {children}
      {count > 0 ? <GCFOverlay theme={theme} /> : null}
    </LoadingContext.Provider>
  );
}

export function useGCFLoading(): LoadingApi {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useGCFLoading must be used inside <GCFLoadingProvider>');
  }
  return ctx;
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  name: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  captionRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  caption: { fontSize: 13, letterSpacing: 0.3 },
  dots: { flexDirection: 'row', marginLeft: 4, marginTop: 3 },
});
