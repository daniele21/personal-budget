import type { InitialDataChoice } from '../state/AppDataProvider';

export type FirstRunState =
  | 'signed-out'
  | 'bootstrapping'
  | 'checking-backup'
  | 'choose-start'
  | 'essential-setup'
  | 'ready';

interface FirstRunInput {
  isLoggedIn: boolean;
  isHydrated: boolean;
  backupCheckComplete: boolean;
  localDataEmpty: boolean;
  initialDataChoice: InitialDataChoice;
  onboardingComplete: boolean;
}

export function deriveFirstRunState(input: FirstRunInput): FirstRunState {
  if (!input.isLoggedIn) return 'signed-out';
  if (!input.isHydrated) return 'bootstrapping';
  if (
    input.localDataEmpty &&
    input.initialDataChoice === null &&
    !input.backupCheckComplete
  ) return 'checking-backup';
  if (input.localDataEmpty && input.initialDataChoice === null) return 'choose-start';
  if (
    input.localDataEmpty &&
    input.initialDataChoice === 'blank' &&
    !input.onboardingComplete
  ) return 'essential-setup';
  return 'ready';
}
