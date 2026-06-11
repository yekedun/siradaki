// apps/mobile/lib/tour/TourContext.tsx
/**
 * Coachmark tour engine.
 * Spec: docs/superpowers/specs/2026-06-10-app-tour-design.md
 *
 * - TourProvider: step state machine (idle → running(index) → done)
 * - TourTarget:   wrapper View that registers itself as a spotlight target
 * - useTourAction: screens register idempotent actions (e.g. open a modal)
 * - useAutoStartTour: auto-start on first mount when the AsyncStorage flag is absent
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export interface TourStep {
  id: string;
  /** expo-router path to navigate to when this step becomes active */
  route?: string;
  /** TourTarget id to spotlight; centered balloon when omitted */
  targetId?: string;
  /** Which TourOverlayHost renders this step. Default: 'root'. */
  host?: string;
  /** Idempotent action ids run when this step becomes active (either direction) */
  onEnter?: string[];
  /** Action ids run when the tour is finished/skipped while on this step (e.g. close a modal). */
  onExitTour?: string[];
  title: string;
  body: string;
}

export interface ActiveTour {
  steps: TourStep[];
  index: number;
  storageKey: string;
}

interface TourContextValue {
  active: ActiveTour | null;
  start: (steps: TourStep[], storageKey: string) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  registerTarget: (id: string, ref: React.RefObject<View | null>) => () => void;
  getTarget: (id: string) => React.RefObject<View | null> | undefined;
  registerAction: (id: string, fn: () => void) => () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveTour | null>(null);
  const targets = useRef(new Map<string, React.RefObject<View | null>>());
  const actions = useRef(new Map<string, () => void>());
  const activeRef = useRef<ActiveTour | null>(null);
  activeRef.current = active;

  const enterStep = useCallback((tour: ActiveTour, index: number) => {
    const step = tour.steps[index];
    if (step.route) router.navigate(step.route as never);
    for (const id of step.onEnter ?? []) actions.current.get(id)?.();
    setActive({ ...tour, index });
  }, []);

  const start = useCallback(
    (steps: TourStep[], storageKey: string) => {
      if (steps.length === 0) return;
      if (activeRef.current !== null) return;
      enterStep({ steps, index: 0, storageKey }, 0);
    },
    [enterStep],
  );

  const finish = useCallback(() => {
    const tour = activeRef.current;
    if (!tour) return;
    const step = tour.steps[tour.index];
    for (const id of step.onExitTour ?? []) actions.current.get(id)?.();
    setActive(null);
    AsyncStorage.setItem(tour.storageKey, '1').catch(() => {});
  }, []);

  const next = useCallback(() => {
    const tour = activeRef.current;
    if (!tour) return;
    if (tour.index >= tour.steps.length - 1) finish();
    else enterStep(tour, tour.index + 1);
  }, [enterStep, finish]);

  const back = useCallback(() => {
    const tour = activeRef.current;
    if (!tour || tour.index === 0) return;
    enterStep(tour, tour.index - 1);
  }, [enterStep]);

  const registerTarget = useCallback(
    (id: string, ref: React.RefObject<View | null>) => {
      targets.current.set(id, ref);
      return () => {
        if (targets.current.get(id) === ref) targets.current.delete(id);
      };
    },
    [],
  );

  const getTarget = useCallback((id: string) => targets.current.get(id), []);

  const registerAction = useCallback((id: string, fn: () => void) => {
    actions.current.set(id, fn);
    return () => {
      if (actions.current.get(id) === fn) actions.current.delete(id);
    };
  }, []);

  const value = useMemo(
    () => ({ active, start, next, back, skip: finish, registerTarget, getTarget, registerAction }),
    [active, start, next, back, finish, registerTarget, getTarget, registerAction],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside TourProvider');
  return ctx;
}

/**
 * Wrap any view to make it spotlight-able.
 * collapsable={false} is required so Android keeps the native view for measureInWindow.
 */
export function TourTarget({
  id,
  children,
  style,
}: {
  id: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { registerTarget } = useTour();
  const ref = useRef<View>(null);
  useEffect(() => registerTarget(id, ref), [id, registerTarget]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

/** Register an idempotent action the tour can trigger via a step's onEnter list. */
export function useTourAction(id: string, fn: () => void) {
  const { registerAction } = useTour();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => registerAction(id, () => fnRef.current()), [id, registerAction]);
}

/** Auto-start the tour once per install (per storageKey). */
export function useAutoStartTour(steps: TourStep[], storageKey: string) {
  const { start } = useTour();
  const startedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(storageKey)
      .then((seen) => {
        if (cancelled || seen != null || startedRef.current) return;
        startedRef.current = true;
        // Let the first screen settle (data fetch spinners, fonts) before spotlighting.
        timerId = setTimeout(() => {
          if (!cancelled) start(steps, storageKey);
        }, 800);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
}
