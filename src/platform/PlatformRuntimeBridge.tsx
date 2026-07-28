import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  acknowledgePendingAppUrl,
  type AppRuntimeTarget,
  subscribeToAppRuntime,
} from './appRuntimeService';
import { publishPaymentCandidateTarget } from './paymentCandidateTarget';

export function PlatformRuntimeBridge({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) {
  const navigate = useNavigate();
  const [pendingTarget, setPendingTarget] = useState<AppRuntimeTarget | null>(null);

  useEffect(() => {
    let active = true;
    let removeSubscription: (() => Promise<void>) | undefined;

    subscribeToAppRuntime((target) => {
      if (active) setPendingTarget(target);
    })
      .then((subscription) => {
        if (!active) {
          void subscription.remove();
          return;
        }
        removeSubscription = () => subscription.remove();
      })
      .catch(() => undefined);

    return () => {
      active = false;
      void removeSubscription?.();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !pendingTarget) return;
    if (pendingTarget.kind === 'route') {
      navigate(pendingTarget.path);
      void acknowledgePendingAppUrl().catch(() => undefined);
    } else {
      publishPaymentCandidateTarget(
        pendingTarget.candidateId,
        acknowledgePendingAppUrl,
      );
    }
    setPendingTarget(null);
  }, [isLoggedIn, navigate, pendingTarget]);

  return null;
}
