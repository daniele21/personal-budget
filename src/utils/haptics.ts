type HapticPattern = number | number[];

function vibrate(pattern: HapticPattern) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate(pattern);
}

export const haptics = {
  tap: () => vibrate(10),
  success: () => vibrate(30),
  warning: () => vibrate([20, 50, 20]),
};
