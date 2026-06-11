// apps/mobile/components/TourOverlay.tsx
/**
 * Spotlight overlay + tooltip balloon for the coachmark tour.
 *
 * TourOverlayHost renders the overlay when the active step belongs to it
 * (step.host, default 'root'). One host lives at the root of each tab group;
 * AddAppointmentModal renders its own host because native RN Modals draw
 * above all root-level views.
 *
 * Spotlight: full-screen SVG rect with a mask that cuts a rounded hole
 * around the measured target. Centered balloon when there is no target
 * or measurement fails (spec §5: the tour must never deadlock).
 */
import React, { useCallback, useEffect, useId, useState } from 'react';
import {
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { colors, radius } from '../lib/theme';
import { useTour } from '../lib/tour/TourContext';

const SPOT_PADDING = 6;
const SPOT_RADIUS = 12;
const MEASURE_INTERVAL_MS = 150;
const MEASURE_MAX_ATTEMPTS = 20; // 3s, then fall back to centered balloon
const BALLOON_EST_HEIGHT = 220;
const SCRIM_COLOR = 'rgba(11,18,32,0.72)'; // colors.ink[900] @ 72%

interface SpotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function TourOverlayHost({ host = 'root' }: { host?: string }) {
  const { active } = useTour();
  if (!active) return null;
  const step = active.steps[active.index];
  if ((step.host ?? 'root') !== host) return null;
  return <TourOverlay key={step.id} />;
}

function TourOverlay() {
  const { active, next, back, skip, getTarget } = useTour();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [rect, setRect] = useState<SpotRect | null>(null);
  const [settled, setSettled] = useState(false);
  const rawId = useId();
  const maskId = rawId.replace(/:/g, '');

  const step = active!.steps[active!.index];
  const isFirst = active!.index === 0;
  const isLast = active!.index === active!.steps.length - 1;

  // Swallow Android back while the tour is running.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Measure the target with retries; give up after MEASURE_MAX_ATTEMPTS.
  const measure = useCallback(() => {
    if (!step.targetId) {
      setRect(null);
      setSettled(true);
      return;
    }
    let attempts = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (cancelled) return;
      attempts += 1;
      const ref = getTarget(step.targetId!);
      const node = ref?.current;
      if (node) {
        node.measureInWindow((x, y, width, height) => {
          if (cancelled) return;
          if (width > 0 && height > 0) {
            setRect({ x, y, width, height });
            setSettled(true);
          } else if (attempts < MEASURE_MAX_ATTEMPTS) {
            timer = setTimeout(tick, MEASURE_INTERVAL_MS);
          } else {
            setRect(null);
            setSettled(true);
          }
        });
      } else if (attempts < MEASURE_MAX_ATTEMPTS) {
        timer = setTimeout(tick, MEASURE_INTERVAL_MS);
      } else {
        setRect(null); // target never mounted (empty state etc.) → centered balloon
        setSettled(true);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [step.targetId, getTarget]);

  useEffect(() => {
    setSettled(false);
    setRect(null);
    const cancel = measure();
    return cancel;
  }, [measure]);

  if (!settled) {
    // Dim immediately so the user can't tap mid-transition; balloon waits for measure.
    return <View style={styles.dimOnly} pointerEvents="auto" />;
  }

  const spot = rect
    ? {
        x: rect.x - SPOT_PADDING,
        y: rect.y - SPOT_PADDING,
        width: rect.width + SPOT_PADDING * 2,
        height: rect.height + SPOT_PADDING * 2,
      }
    : null;

  // Balloon below the spotlight when there is room, otherwise above; centered as fallback.
  const balloonBelow = spot ? spot.y + spot.height + 12 : null;
  const balloonAboveRaw = spot ? winH - spot.y + 12 : null;
  // Clamp so the balloon never overflows past the safe-area top.
  const balloonAbove = balloonAboveRaw !== null
    ? Math.min(balloonAboveRaw, winH - insets.top - (BALLOON_EST_HEIGHT + 12))
    : null;
  const placeBelow = spot ? spot.y + spot.height + BALLOON_EST_HEIGHT < winH : false;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Svg width={winW} height={winH}>
        <Defs>
          <Mask id={maskId}>
            <Rect x={0} y={0} width={winW} height={winH} fill="#fff" />
            {spot && (
              <Rect
                x={spot.x}
                y={spot.y}
                width={spot.width}
                height={spot.height}
                rx={SPOT_RADIUS}
                fill="#000"
              />
            )}
          </Mask>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={winW}
          height={winH}
          fill={SCRIM_COLOR}
          mask={`url(#${maskId})`}
        />
      </Svg>

      <View
        style={[
          styles.balloon,
          spot
            ? placeBelow
              ? { top: balloonBelow! }
              : { bottom: balloonAbove! }
            : { top: '38%' },
          { marginTop: spot ? 0 : insets.top },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.stepCounter}>
              {active!.index + 1} / {active!.steps.length}
            </Text>
            <TouchableOpacity onPress={skip} hitSlop={12} accessibilityRole="button" accessibilityLabel="Turu atla">
              <Text style={styles.skipText}>Atla</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.btnRow}>
            {!isFirst && (
              <TouchableOpacity
                onPress={back}
                style={styles.backBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Önceki adım"
              >
                <Text style={styles.backBtnText}>Geri</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={next}
              style={styles.nextBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Turu bitir' : 'Sonraki adım'}
            >
              <Text style={styles.nextBtnText}>{isLast ? 'Bitir' : 'İleri'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dimOnly: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SCRIM_COLOR,
  },
  balloon: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  card: {
    backgroundColor: colors.slate[0],
    borderRadius: radius.lg,
    padding: 18,
    shadowColor: colors.ink[900],
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCounter: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.slate[500],
  },
  skipText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 13,
    color: colors.slate[500],
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 17,
    color: colors.ink[900],
  },
  body: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate[500],
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  backBtnText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: colors.ink[900],
  },
  nextBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: colors.ink[900],
  },
  nextBtnText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: colors.slate[0],
  },
});
