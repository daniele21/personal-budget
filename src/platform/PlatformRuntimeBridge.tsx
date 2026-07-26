import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  acknowledgePendingAppUrl,
  subscribeToAppRuntime,
} from './appRuntimeService';

export function PlatformRuntimeBridge({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) {
  const navigate = useNavigate();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let removeSubscription: (() => Promise<void>) | undefined;

    subscribeToAppRuntime((path) => {
      if (active) setPendingPath(path);
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
    if (!isLoggedIn || !pendingPath) return;
    navigate(pendingPath);
    setPendingPath(null);
    void acknowledgePendingAppUrl().catch(() => undefined);
  }, [isLoggedIn, navigate, pendingPath]);

  return null;
}
