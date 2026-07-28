import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  candidateToReviewForm,
  paymentCandidateToTransaction,
  type PaymentCandidateReviewForm,
} from '../domain/payment-detection';
import {
  acknowledgePaymentCandidateTarget,
  subscribePaymentCandidateTarget,
} from '../platform/paymentCandidateTarget';
import {
  paymentDetection,
  subscribeToPaymentCandidates,
  type NativePaymentDetectionStatus,
  type NativeSupportedPaymentApp,
  type PaymentCandidateReviewDto,
} from '../platform/paymentDetection';
import { subscribeAppResumed } from '../platform/appRuntimeService';
import type { Transaction } from '../types';

type PaymentDetectionAvailability =
  | 'checking'
  | 'unsupported'
  | 'ready'
  | 'error';

interface PaymentDetectionContextValue {
  availability: PaymentDetectionAvailability;
  status: NativePaymentDetectionStatus | null;
  supportedApps: NativeSupportedPaymentApp[];
  candidates: PaymentCandidateReviewDto[];
  selectedCandidate: PaymentCandidateReviewDto | null;
  selectedCandidateId: string | null;
  busyCandidateId: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  selectCandidate: (candidateId: string | null) => void;
  ignoreCandidate: (candidateId: string) => Promise<void>;
  confirmCandidate: (
    candidateId: string,
    form: PaymentCandidateReviewForm,
  ) => Promise<Transaction>;
  updateSelectedApps: (packages: string[]) => Promise<void>;
  setRequestedEnabled: (enabled: boolean) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  openNotificationAccessSettings: () => Promise<void>;
  deleteAllCandidates: () => Promise<number>;
}

const PaymentDetectionContext =
  createContext<PaymentDetectionContextValue | null>(null);

interface PaymentDetectionProviderProps {
  children: React.ReactNode;
  active: boolean;
  appDataHydrated: boolean;
  transactions: Transaction[];
  categories: string[];
  createTransactionVerified: (transaction: Transaction) => Promise<void>;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Payment detection is temporarily unavailable.';
}

function candidateWasEdited(
  candidate: PaymentCandidateReviewDto,
  form: PaymentCandidateReviewForm,
  categories: string[],
): boolean {
  const initial = candidateToReviewForm(candidate, categories);
  return (
    form.amount !== initial.amount ||
    form.title.trim() !== initial.title ||
    form.date !== initial.date
  );
}

export function PaymentDetectionProvider({
  children,
  active,
  appDataHydrated,
  transactions,
  categories,
  createTransactionVerified,
}: PaymentDetectionProviderProps) {
  const navigate = useNavigate();
  const [availability, setAvailability] =
    useState<PaymentDetectionAvailability>('checking');
  const [status, setStatus] = useState<NativePaymentDetectionStatus | null>(null);
  const [supportedApps, setSupportedApps] =
    useState<NativeSupportedPaymentApp[]>([]);
  const [candidates, setCandidates] = useState<PaymentCandidateReviewDto[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] =
    useState<string | null>(null);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transactionIdsRef = useRef<string[]>([]);

  useEffect(() => {
    transactionIdsRef.current = transactions.map((transaction) => transaction.id);
  }, [transactions]);

  const refreshMetadata = useCallback(async () => {
    const [nextStatus, apps] = await Promise.all([
      paymentDetection.getStatus(),
      paymentDetection.listSupportedApps(),
    ]);
    setStatus(nextStatus);
    setSupportedApps(apps.apps);
  }, []);

  const recoverAcceptance = useCallback(async () => {
    await paymentDetection.recoverAcceptance(transactionIdsRef.current);
  }, []);

  const refresh = useCallback(async () => {
    if (!active || !appDataHydrated) return;
    try {
      await recoverAcceptance();
      const [nextCandidates] = await Promise.all([
        paymentDetection.listCandidates(),
        refreshMetadata(),
      ]);
      setCandidates(nextCandidates);
      setAvailability('ready');
      setError(null);
    } catch (refreshError) {
      setAvailability('error');
      setError(errorMessage(refreshError));
    }
  }, [active, appDataHydrated, recoverAcceptance, refreshMetadata]);

  useEffect(() => {
    if (!active || !appDataHydrated) {
      setCandidates([]);
      setSelectedCandidateId(null);
      return;
    }

    let cancelled = false;
    let candidateSubscription:
      | Awaited<ReturnType<typeof subscribeToPaymentCandidates>>
      | undefined;

    const start = async () => {
      setAvailability('checking');
      try {
        const supported = await paymentDetection.isSupported();
        if (cancelled) return;
        if (!supported) {
          setAvailability('unsupported');
          return;
        }
        await refreshMetadata();
        candidateSubscription = await subscribeToPaymentCandidates(
          (nextCandidates) => {
            if (!cancelled) {
              setCandidates(nextCandidates);
              setAvailability('ready');
              setError(null);
            }
          },
          (subscriptionError) => {
            if (!cancelled) {
              setAvailability('error');
              setError(errorMessage(subscriptionError));
            }
          },
          recoverAcceptance,
        );
      } catch (startError) {
        if (!cancelled) {
          setAvailability('error');
          setError(errorMessage(startError));
        }
      }
    };

    void start();
    const removeResume = subscribeAppResumed(() => {
      void refreshMetadata().catch((resumeError) => {
        if (!cancelled) setError(errorMessage(resumeError));
      });
    });

    return () => {
      cancelled = true;
      removeResume();
      void candidateSubscription?.remove();
    };
  }, [
    active,
    appDataHydrated,
    recoverAcceptance,
    refreshMetadata,
  ]);

  useEffect(() => {
    const removeTarget = subscribePaymentCandidateTarget((target) => {
      if (!active || !appDataHydrated) return;
      void (async () => {
        try {
          const candidate = await paymentDetection.getCandidate(target.candidateId);
          setCandidates((current) => {
            const withoutTarget = current.filter((item) => item.id !== candidate.id);
            return [candidate, ...withoutTarget];
          });
          setSelectedCandidateId(candidate.id);
          navigate('/payment-detection');
          await acknowledgePaymentCandidateTarget();
        } catch (targetError) {
          setError(
            targetError instanceof Error
              ? targetError.message
              : 'This payment candidate is no longer available.',
          );
          navigate('/payment-detection');
          await acknowledgePaymentCandidateTarget().catch(() => undefined);
          await refresh();
        }
      })();
    });
    return removeTarget;
  }, [active, appDataHydrated, navigate, refresh]);

  const selectCandidate = useCallback((candidateId: string | null) => {
    setSelectedCandidateId(candidateId);
    setError(null);
  }, []);

  const ignoreCandidate = useCallback(async (candidateId: string) => {
    setBusyCandidateId(candidateId);
    try {
      await paymentDetection.ignoreCandidate(candidateId);
      setCandidates((current) =>
        current.filter((candidate) => candidate.id !== candidateId),
      );
      setSelectedCandidateId((current) =>
        current === candidateId ? null : current,
      );
      setError(null);
    } catch (ignoreError) {
      setError(errorMessage(ignoreError));
      throw ignoreError;
    } finally {
      setBusyCandidateId(null);
    }
  }, []);

  const confirmCandidate = useCallback(async (
    candidateId: string,
    form: PaymentCandidateReviewForm,
  ): Promise<Transaction> => {
    setBusyCandidateId(candidateId);
    let persistedTransaction: Transaction | null = null;
    try {
      const candidate = candidates.find((item) => item.id === candidateId);
      if (!candidate) throw new Error('This payment candidate is no longer available.');

      const reservation = await paymentDetection.beginAcceptance(candidateId);
      if (reservation.candidate.id !== candidateId) {
        throw new Error('The native candidate changed during review.');
      }
      const transaction = paymentCandidateToTransaction(
        reservation.reservedTransactionId,
        form,
      );
      await createTransactionVerified(transaction);
      persistedTransaction = transaction;

      try {
        await paymentDetection.completeAcceptance({
          candidateId,
          acceptanceToken: reservation.acceptanceToken,
          edited: candidateWasEdited(candidate, form, categories),
        });
      } catch (completionError) {
        const recovery = await paymentDetection.recoverAcceptance([
          ...transactionIdsRef.current,
          transaction.id,
        ]);
        if (!recovery.completedCandidateIds.includes(candidateId)) {
          throw completionError;
        }
      }

      setCandidates((current) =>
        current.filter((item) => item.id !== candidateId),
      );
      setSelectedCandidateId(null);
      setError(null);
      return transaction;
    } catch (acceptanceError) {
      setError(
        persistedTransaction
          ? 'The transaction was saved. Aura will finish candidate cleanup automatically.'
          : errorMessage(acceptanceError),
      );
      throw acceptanceError;
    } finally {
      setBusyCandidateId(null);
    }
  }, [candidates, categories, createTransactionVerified]);

  const updateSelectedApps = useCallback(async (packages: string[]) => {
    if (!status) return;
    const nextStatus = await paymentDetection.updateSettings({
      requestedEnabled: status.requestedEnabled,
      selectedPackages: packages,
    });
    setStatus(nextStatus);
  }, [status]);

  const setRequestedEnabled = useCallback(async (enabled: boolean) => {
    if (!status) return;
    const nextStatus = await paymentDetection.updateSettings({
      requestedEnabled: enabled,
      selectedPackages: status.selectedPackages,
    });
    setStatus(nextStatus);
  }, [status]);

  const requestNotificationPermission = useCallback(async () => {
    const result = await paymentDetection.requestAuraNotificationPermission();
    await refreshMetadata();
    return result.granted;
  }, [refreshMetadata]);

  const openNotificationAccessSettings = useCallback(async () => {
    await paymentDetection.openNotificationAccessSettings();
  }, []);

  const deleteAllCandidates = useCallback(async () => {
    const result = await paymentDetection.deleteAllCandidates();
    setCandidates([]);
    setSelectedCandidateId(null);
    return result.deletedCount;
  }, []);

  const selectedCandidate = useMemo(
    () =>
      candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  );

  const value = useMemo<PaymentDetectionContextValue>(() => ({
    availability,
    status,
    supportedApps,
    candidates,
    selectedCandidate,
    selectedCandidateId,
    busyCandidateId,
    error,
    refresh,
    selectCandidate,
    ignoreCandidate,
    confirmCandidate,
    updateSelectedApps,
    setRequestedEnabled,
    requestNotificationPermission,
    openNotificationAccessSettings,
    deleteAllCandidates,
  }), [
    availability,
    status,
    supportedApps,
    candidates,
    selectedCandidate,
    selectedCandidateId,
    busyCandidateId,
    error,
    refresh,
    selectCandidate,
    ignoreCandidate,
    confirmCandidate,
    updateSelectedApps,
    setRequestedEnabled,
    requestNotificationPermission,
    openNotificationAccessSettings,
    deleteAllCandidates,
  ]);

  return (
    <PaymentDetectionContext.Provider value={value}>
      {children}
    </PaymentDetectionContext.Provider>
  );
}

export function usePaymentDetection(): PaymentDetectionContextValue {
  const context = useContext(PaymentDetectionContext);
  if (!context) {
    throw new Error(
      'usePaymentDetection must be used within PaymentDetectionProvider.',
    );
  }
  return context;
}
