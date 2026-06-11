// apps/mobile/lib/tour/__tests__/TourContext.test.tsx
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TourProvider, useTour, useAutoStartTour, type TourStep } from '../TourContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));

const steps: TourStep[] = [
  { id: 'a', title: 'A', body: 'a' },
  { id: 'b', title: 'B', body: 'b', route: '/(owner)/agenda' },
  { id: 'c', title: 'C', body: 'c', onEnter: ['open-thing'] },
];

function Harness() {
  const tour = useTour();
  return (
    <>
      <Text testID="state">
        {tour.active ? `${tour.active.steps[tour.active.index].id}:${tour.active.index}` : 'idle'}
      </Text>
      <TouchableOpacity testID="start" onPress={() => tour.start(steps, 'tour_test_v1')} />
      <TouchableOpacity testID="next" onPress={tour.next} />
      <TouchableOpacity testID="back" onPress={tour.back} />
      <TouchableOpacity testID="skip" onPress={tour.skip} />
    </>
  );
}

function renderHarness() {
  return render(
    <TourProvider>
      <Harness />
    </TourProvider>,
  );
}

describe('TourContext state machine', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts idle, advances with next, retreats with back', () => {
    const { getByTestId } = renderHarness();
    expect(getByTestId('state').props.children).toBe('idle');
    fireEvent.press(getByTestId('start'));
    expect(getByTestId('state').props.children).toBe('a:0');
    fireEvent.press(getByTestId('next'));
    expect(getByTestId('state').props.children).toBe('b:1');
    fireEvent.press(getByTestId('back'));
    expect(getByTestId('state').props.children).toBe('a:0');
    // back on first step stays put
    fireEvent.press(getByTestId('back'));
    expect(getByTestId('state').props.children).toBe('a:0');
  });

  it('navigates when entering a step with a route', () => {
    const { router } = require('expo-router');
    const { getByTestId } = renderHarness();
    fireEvent.press(getByTestId('start'));
    fireEvent.press(getByTestId('next'));
    expect(router.navigate).toHaveBeenCalledWith('/(owner)/agenda');
  });

  it('runs registered onEnter actions and tolerates unregistered ones', () => {
    const open = jest.fn();
    function ActionHarness() {
      const tour = useTour();
      React.useEffect(() => tour.registerAction('open-thing', open), []);
      return <Harness />;
    }
    const { getByTestId } = render(
      <TourProvider>
        <ActionHarness />
      </TourProvider>,
    );
    fireEvent.press(getByTestId('start'));
    fireEvent.press(getByTestId('next'));
    fireEvent.press(getByTestId('next')); // enter 'c'
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('next on the last step finishes and persists the seen flag', async () => {
    const { getByTestId } = renderHarness();
    fireEvent.press(getByTestId('start'));
    fireEvent.press(getByTestId('next'));
    fireEvent.press(getByTestId('next'));
    fireEvent.press(getByTestId('next')); // finish
    expect(getByTestId('state').props.children).toBe('idle');
    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('tour_test_v1', '1'),
    );
  });

  it('skip finishes and persists the seen flag', async () => {
    const { getByTestId } = renderHarness();
    fireEvent.press(getByTestId('start'));
    fireEvent.press(getByTestId('skip'));
    expect(getByTestId('state').props.children).toBe('idle');
    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('tour_test_v1', '1'),
    );
  });

  it('start while a tour is already running is a no-op', () => {
    const { getByTestId } = renderHarness();
    fireEvent.press(getByTestId('start'));  // idle → a:0
    fireEvent.press(getByTestId('next'));   // a:0 → b:1
    expect(getByTestId('state').props.children).toBe('b:1');
    fireEvent.press(getByTestId('start'));  // should be ignored
    expect(getByTestId('state').props.children).toBe('b:1');
  });

  it('skip runs onExitTour actions of the current step (Finding 2)', () => {
    const cleanup = jest.fn();
    const stepsWithExit: TourStep[] = [
      { id: 'x', title: 'X', body: 'x' },
      { id: 'y', title: 'Y', body: 'y', onExitTour: ['cleanup-thing'] },
    ];
    function ExitHarness() {
      const tour = useTour();
      React.useEffect(() => tour.registerAction('cleanup-thing', cleanup), []);
      return (
        <>
          <Text testID="state">
            {tour.active ? `${tour.active.steps[tour.active.index].id}` : 'idle'}
          </Text>
          <TouchableOpacity testID="start" onPress={() => tour.start(stepsWithExit, 'tour_exit_test_v1')} />
          <TouchableOpacity testID="next" onPress={tour.next} />
          <TouchableOpacity testID="skip" onPress={tour.skip} />
        </>
      );
    }
    const { getByTestId } = render(
      <TourProvider>
        <ExitHarness />
      </TourProvider>,
    );
    fireEvent.press(getByTestId('start'));
    fireEvent.press(getByTestId('next')); // now on step 'y'
    expect(getByTestId('state').props.children).toBe('y');
    expect(cleanup).not.toHaveBeenCalled();
    fireEvent.press(getByTestId('skip'));
    expect(getByTestId('state').props.children).toBe('idle');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('finish (next on last step) runs onExitTour actions (Finding 2)', () => {
    const cleanup = jest.fn();
    const stepsWithExit: TourStep[] = [
      { id: 'p', title: 'P', body: 'p', onExitTour: ['cleanup-thing'] },
    ];
    function ExitHarness2() {
      const tour = useTour();
      React.useEffect(() => tour.registerAction('cleanup-thing', cleanup), []);
      return (
        <>
          <Text testID="state">
            {tour.active ? `${tour.active.steps[tour.active.index].id}` : 'idle'}
          </Text>
          <TouchableOpacity testID="start" onPress={() => tour.start(stepsWithExit, 'tour_exit2_test_v1')} />
          <TouchableOpacity testID="next" onPress={tour.next} />
        </>
      );
    }
    const { getByTestId } = render(
      <TourProvider>
        <ExitHarness2 />
      </TourProvider>,
    );
    fireEvent.press(getByTestId('start'));
    expect(getByTestId('state').props.children).toBe('p');
    fireEvent.press(getByTestId('next')); // finish (last step)
    expect(getByTestId('state').props.children).toBe('idle');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('registerTarget stores and unregisters refs', () => {
    let api!: ReturnType<typeof useTour>;
    function Grab() {
      api = useTour();
      return null;
    }
    render(
      <TourProvider>
        <Grab />
      </TourProvider>,
    );
    const ref = React.createRef<any>();
    let unregister!: () => void;
    act(() => { unregister = api.registerTarget('t1', ref); });
    expect(api.getTarget('t1')).toBe(ref);
    act(() => unregister());
    expect(api.getTarget('t1')).toBeUndefined();
  });
});

describe('useAutoStartTour timer cleanup (Finding 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears the 800ms setTimeout when the component unmounts before it fires', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    function AutoHarness() {
      useAutoStartTour(steps, 'tour_auto_test_v1');
      return null;
    }
    const { unmount } = render(
      <TourProvider>
        <AutoHarness />
      </TourProvider>,
    );

    // Let the AsyncStorage promise resolve so setTimeout is scheduled
    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
