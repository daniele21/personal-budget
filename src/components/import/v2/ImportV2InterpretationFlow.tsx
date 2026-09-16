import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { StructuredImportValidationResult } from '../../../domain/import';
import {
  confirmImportV2Interpretation,
  type ImportV2InterpretationFeedback,
  type ImportV2InterpretationFeedbackArea,
  type ImportV2InterpretationProposal,
  type ImportV2RawDocument,
} from '../../../domain/import/v2';
import {
  executeConfirmedImportV2Interpretation,
  inferImportV2PlanWithHarnex,
  repairUnresolvedImportV2RowsWithHarnex,
} from '../../../services/import';
import type { HarnexFailure } from '../../../platform/harnex';
import { ImportV2InterpretationReview } from './ImportV2InterpretationReview';
import { ImportV2TaskStatePanel } from './ImportV2TaskStatePanel';
import type {
  ImportV2AssistanceFailureReason,
  ImportV2TaskAction,
  ImportV2TaskState,
} from './importV2TaskState';

interface ImportV2InterpretationFlowProps {
  file: File;
  rawDocument: ImportV2RawDocument;
  onResolved: (validation: StructuredImportValidationResult) => Promise<void> | void;
  onManualFallback: (kind: 'ambiguous' | 'unsupported' | 'unavailable') => void;
}

type InferenceRequest = {
  feedback?: ImportV2InterpretationFeedback;
  priorProposal?: ImportV2InterpretationProposal;
};

type FlowState =
  | { kind: 'loading' }
  | { kind: 'review'; proposal: ImportV2InterpretationProposal; issue: string | null }
  | { kind: 'assistance-unavailable'; reason: ImportV2AssistanceFailureReason }
  | { kind: 'cancelled' };

function assistanceFailureReason(failure: HarnexFailure): ImportV2AssistanceFailureReason {
  switch (failure.code) {
    case 'HOST_NOT_INSTALLED':
      return 'host-missing';
    case 'UNAUTHORIZED':
      return 'unauthorized';
    case 'USE_CASE_NOT_ASSIGNED':
    case 'USE_CASE_UNAVAILABLE':
    case 'INCOMPATIBLE':
    case 'CAPABILITY_CHANGED':
      return 'use-case-unready';
    case 'MODEL_UNAVAILABLE':
    case 'BUSY':
      return 'model-unready';
    default:
      return 'harnex-unavailable';
  }
}

function taskState(state: FlowState): ImportV2TaskState | null {
  switch (state.kind) {
    case 'loading':
      return { kind: 'local-analysis', step: 'understand-file' };
    case 'assistance-unavailable':
      return { kind: 'assistance-unavailable', step: 'understand-file', reason: state.reason };
    case 'cancelled':
      return { kind: 'cancelled', step: 'understand-file' };
    case 'review':
      return null;
  }
}

export function ImportV2InterpretationFlow({
  file,
  rawDocument,
  onResolved,
  onManualFallback,
}: ImportV2InterpretationFlowProps) {
  const requestSequenceRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const retryRequestRef = useRef<InferenceRequest>({});
  const [state, setState] = useState<FlowState>({ kind: 'loading' });
  const [isExecuting, setIsExecuting] = useState(false);

  const runInference = useCallback(async (request: InferenceRequest = {}) => {
    retryRequestRef.current = request;
    const requestSequence = ++requestSequenceRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsExecuting(false);
    setState({ kind: 'loading' });

    try {
      const outcome = await inferImportV2PlanWithHarnex(rawDocument, {
        signal: controller.signal,
        ...(request.feedback ? { feedback: request.feedback } : {}),
      });
      if (requestSequence !== requestSequenceRef.current) return;

      if (outcome.status === 'resolved') {
        retryRequestRef.current = {};
        setState({ kind: 'review', proposal: outcome.proposal, issue: null });
        return;
      }

      if (outcome.status === 'ambiguous' || outcome.status === 'unsupported') {
        if (request.priorProposal) {
          const issue = outcome.status === 'unsupported'
            ? 'Harnex could not produce a safe revised interpretation. Choose another correction area or continue with manual mapping.'
            : 'Harnex could not resolve the requested correction safely. Choose another correction area or continue with manual mapping.';
          retryRequestRef.current = {};
          setState({ kind: 'review', proposal: request.priorProposal, issue });
          return;
        }
        onManualFallback(outcome.status);
        return;
      }

      if (outcome.failure.code === 'PLATFORM_UNSUPPORTED') {
        onManualFallback('unavailable');
        return;
      }
      if (outcome.failure.code === 'CANCELLED') {
        setState({ kind: 'cancelled' });
        return;
      }
      setState({ kind: 'assistance-unavailable', reason: assistanceFailureReason(outcome.failure) });
    } catch {
      if (requestSequence !== requestSequenceRef.current) return;
      setState({ kind: 'assistance-unavailable', reason: 'harnex-unavailable' });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [onManualFallback, rawDocument]);

  useEffect(() => {
    void runInference();
    return () => {
      requestSequenceRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [runInference]);

  const handleRevision = useCallback((area: ImportV2InterpretationFeedbackArea) => {
    if (state.kind !== 'review') return;
    const feedback: ImportV2InterpretationFeedback = {
      area,
      previousProposal: {
        proposalId: state.proposal.proposalId,
        plan: state.proposal.plan,
      },
    };
    void runInference({ feedback, priorProposal: state.proposal });
  }, [runInference, state]);

  const handleConfirm = useCallback(async () => {
    if (state.kind !== 'review' || state.issue) return;
    const operationSequence = ++requestSequenceRef.current;
    let repairController: AbortController | null = null;
    setIsExecuting(true);
    try {
      const confirmed = confirmImportV2Interpretation(state.proposal);
      const outcome = await executeConfirmedImportV2Interpretation(file, confirmed);
      if (operationSequence !== requestSequenceRef.current) return;

      if (outcome.status === 'resolved') {
        await onResolved(outcome.validation);
        return;
      }
      if (outcome.status === 'unresolved') {
        repairController = new AbortController();
        controllerRef.current = repairController;
        const repair = await repairUnresolvedImportV2RowsWithHarnex(file, confirmed, outcome, {
          signal: repairController.signal,
        });
        if (operationSequence !== requestSequenceRef.current) return;
        if (repair.status === 'resolved') {
          await onResolved(repair.validation);
          return;
        }
        if (repair.status === 'global-plan-wrong') {
          setState({
            kind: 'review',
            proposal: state.proposal,
            issue: 'The unresolved rows indicate that the confirmed interpretation needs a broader revision. No transaction was imported. Use “Something is wrong” to request a new global proposal, or continue with manual mapping.',
          });
          return;
        }
        const remaining = repair.sourceRowNumbers.length;
        const assistance = repair.status === 'assistance-unavailable'
          ? ' Bounded Harnex row repair is not available right now.'
          : ' Bounded Harnex row repair could not resolve them safely.';
        setState({
          kind: 'review',
          proposal: state.proposal,
          issue: `${remaining} source ${remaining === 1 ? 'row still needs' : 'rows still need'} a safe interpretation. No transaction was imported.${assistance} Use “Something is wrong” and choose “Some rows” or “Missing transactions” to request a revised interpretation.`,
        });
        return;
      }
      setState({
        kind: 'review',
        proposal: state.proposal,
        issue: 'Aura could not safely execute this interpretation against the full file. No transaction was imported. Ask Harnex to revise the interpretation or continue with manual mapping.',
      });
    } catch {
      if (operationSequence !== requestSequenceRef.current) return;
      setState({
        kind: 'review',
        proposal: state.proposal,
        issue: 'Aura could not safely finish checking this interpretation. No transaction was imported. Retry with a revised interpretation or continue manually.',
      });
    } finally {
      if (repairController && controllerRef.current === repairController) controllerRef.current = null;
      if (operationSequence === requestSequenceRef.current) setIsExecuting(false);
    }
  }, [file, onResolved, state]);

  const handleTaskAction = useCallback((action: ImportV2TaskAction) => {
    if (action === 'cancel') {
      requestSequenceRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
      setState({ kind: 'cancelled' });
      return;
    }
    if (action === 'continue-manually') {
      onManualFallback('unavailable');
      return;
    }
    if (action === 'retry') {
      void runInference(retryRequestRef.current);
    }
  }, [onManualFallback, runInference]);

  if (state.kind === 'review') {
    return (
      <ImportV2InterpretationReview
        proposal={state.proposal}
        issue={state.issue}
        isBusy={isExecuting}
        onConfirm={() => { void handleConfirm(); }}
        onRequestRevision={handleRevision}
        onContinueManually={() => onManualFallback('unavailable')}
      />
    );
  }

  const panelState = taskState(state);
  return panelState ? <ImportV2TaskStatePanel state={panelState} onAction={handleTaskAction} /> : null;
}
