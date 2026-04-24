/**
 * Correlated Mutation Hook
 * 
 * A wrapper around useMutation that automatically adds correlation IDs
 * to operations for traceability in audit logs and debugging.
 */

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { 
  startOperation, 
  endOperation, 
  createCorrelatedLogger,
  addCorrelationMetadata 
} from '@/lib/correlationId';

export interface CorrelatedMutationContext {
  correlationId: string;
  log: ReturnType<typeof createCorrelatedLogger>;
}

export interface CorrelatedMutationOptions<TData, TError, TVariables, TContext> 
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  /** The type of operation being performed (e.g., 'withdrawal_approve', 'yield_distribute') */
  operationType: string;
  
  /** The mutation function that receives the correlation context */
  mutationFn: (
    variables: TVariables, 
    context: CorrelatedMutationContext
  ) => Promise<TData>;
  
  /** Optional metadata to include with the correlation */
  getMetadata?: (variables: TVariables) => Record<string, unknown>;
}

export function useCorrelatedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: CorrelatedMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> & {
  getCorrelationId: () => string | null;
} {
  const { operationType, mutationFn, getMetadata, ...mutationOptions } = options;
  const correlationIdRef = useRef<string | null>(null);
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;
  const getMetadataRef = useRef(getMetadata);
  getMetadataRef.current = getMetadata;

  const wrappedMutationFn = useCallback(async (variables: TVariables): Promise<TData> => {
    // Start correlation
    const metadata = getMetadataRef.current?.(variables) ?? {};
    const correlationId = startOperation(operationType, metadata);
    correlationIdRef.current = correlationId;

    const log = createCorrelatedLogger(correlationId);

    try {
      log.info(`Starting ${operationType}`, metadata);

      const result = await mutationFnRef.current(variables, { correlationId, log });

      log.info(`Completed ${operationType}`);
      return result;
    } catch (error) {
      log.error(`Failed ${operationType}`, error, metadata);
      throw error;
    } finally {
      endOperation(correlationId);
    }
  }, [operationType]);

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    mutationFn: wrappedMutationFn,
  });

  return {
    ...mutation,
    getCorrelationId: () => correlationIdRef.current,
  };
}

/**
 * Example usage:
 * 
 * const approveMutation = useCorrelatedMutation({
 *   operationType: 'withdrawal_approve',
 *   mutationFn: async (variables, { correlationId, log }) => {
 *     log.info('Calling approve RPC', { withdrawalId: variables.id });
 *     return withdrawalService.approveWithdrawal(variables.id, variables.amount);
 *   },
 *   getMetadata: (variables) => ({
 *     withdrawalId: variables.id,
 *     amount: variables.amount,
 *   }),
 *   onSuccess: () => {
 *     toast.success('Withdrawal approved');
 *     queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
 *   },
 * });
 */
