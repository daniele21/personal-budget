export interface PaymentCandidateTarget {
  candidateId: string;
}

type PaymentCandidateTargetListener = (target: PaymentCandidateTarget) => void;

const listeners = new Set<PaymentCandidateTargetListener>();
let pendingTarget: PaymentCandidateTarget | null = null;
let pendingAcknowledgement: (() => Promise<void>) | null = null;

export function publishPaymentCandidateTarget(
  candidateId: string,
  acknowledge: () => Promise<void> = async () => undefined,
): void {
  pendingTarget = { candidateId };
  pendingAcknowledgement = acknowledge;
  for (const listener of listeners) listener(pendingTarget);
}

export function getPendingPaymentCandidateTarget(): PaymentCandidateTarget | null {
  return pendingTarget;
}

export function clearPendingPaymentCandidateTarget(): void {
  pendingTarget = null;
  pendingAcknowledgement = null;
}

export async function acknowledgePaymentCandidateTarget(): Promise<void> {
  const acknowledge = pendingAcknowledgement;
  clearPendingPaymentCandidateTarget();
  await acknowledge?.();
}

export function subscribePaymentCandidateTarget(
  listener: PaymentCandidateTargetListener,
): () => void {
  listeners.add(listener);
  if (pendingTarget) listener(pendingTarget);
  return () => listeners.delete(listener);
}
