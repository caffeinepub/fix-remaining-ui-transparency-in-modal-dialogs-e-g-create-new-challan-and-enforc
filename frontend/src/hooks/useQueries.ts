import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { calculateDashboardMetrics } from '../utils/dashboardMetrics';
import type {
  InventoryItem,
  Challan,
  ChallanItem,
  Payment,
  PettyCash,
  PettyCashCategory,
  PettyCashAttachment,
  Client,
} from '../backend';

// ── Clients ──────────────────────────────────────────────────────────────────

export function useClients() {
  const { actor, isFetching } = useActor();
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllClients();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, createdAt }: { name: string; createdAt: bigint }) => {
      if (!actor) throw new Error('Not connected');
      return actor.addClient(name, createdAt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Not connected');
      return actor.deleteClient(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useBulkCreateClients() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: Client[]) => {
      if (!actor) throw new Error('Not connected');
      return actor.bulkCreateClients(batch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// ── Inventory ────────────────────────────────────────────────────────────────

export function useInventory() {
  const { actor, isFetching } = useActor();
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInventory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, totalQuantity, dailyRate }: { name: string; totalQuantity: number; dailyRate: number }) => {
      if (!actor) throw new Error('Not connected');
      return actor.addInventoryItem(name, totalQuantity, dailyRate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, totalQuantity, dailyRate }: { name: string; totalQuantity: number; dailyRate: number }) => {
      if (!actor) throw new Error('Not connected');
      return actor.updateInventoryItem(name, totalQuantity, dailyRate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useDeleteInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Not connected');
      return actor.deleteInventoryItem(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useBulkCreateInventoryItems() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: InventoryItem[]) => {
      if (!actor) throw new Error('Not connected');
      return actor.bulkCreateInventoryItems(batch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// ── Challans ─────────────────────────────────────────────────────────────────

export function useChallans() {
  const { actor, isFetching } = useActor();
  return useQuery<Challan[]>({
    queryKey: ['challans'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllChallans();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateChallan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      clientName: string;
      venue: string;
      items: ChallanItem[];
      freight: number;
      numberOfDays: number;
      rentDate: bigint;
      site: string;
      creationDate: bigint;
    }) => {
      if (!actor) throw new Error('Not connected');
      return actor.createChallan(
        params.id,
        params.clientName,
        params.venue,
        params.items,
        params.freight,
        params.numberOfDays,
        params.rentDate,
        params.site,
        params.creationDate,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateChallan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      clientName: string;
      venue: string;
      items: ChallanItem[];
      freight: number;
      numberOfDays: number;
      rentDate: bigint;
      site: string;
    }) => {
      if (!actor) throw new Error('Not connected');
      return actor.updateChallan(
        params.id,
        params.clientName,
        params.venue,
        params.items,
        params.freight,
        params.numberOfDays,
        params.rentDate,
        params.site,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useDeleteChallan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Not connected');
      return actor.deleteChallan(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useMarkChallanReturned() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Not connected');
      return actor.markChallanReturned(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useBulkCreateChallans() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: Challan[]) => {
      if (!actor) throw new Error('Not connected');
      return actor.bulkCreateChallans(batch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// Alias for restore dates — uses same bulk create under the hood
export function useRestoreChallanDates() {
  return useBulkCreateChallans();
}

// ── Payments ─────────────────────────────────────────────────────────────────

export function usePayments() {
  const { actor, isFetching } = useActor();
  return useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPayments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      date: bigint;
      client: string;
      mode: string;
      amount: number;
      referenceNumber: string;
      site: string;
    }) => {
      if (!actor) throw new Error('Not connected');
      const createdAt = BigInt(Date.now()) * 1_000_000n;
      return actor.addPayment(
        params.id,
        params.date,
        params.client,
        params.mode,
        params.amount,
        params.referenceNumber,
        createdAt,
        params.site,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

export function useBulkAddPayments() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: Payment[]) => {
      if (!actor) throw new Error('Not connected');
      return actor.bulkAddPayments(batch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

// ── Petty Cash ───────────────────────────────────────────────────────────────

export function usePettyCash() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['pettyCash'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPettyCashRecordsWithAttachments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddPettyCash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      date: bigint;
      openingBalance: number;
      cashFromMd: number;
      expenses: number;
      staffAdvance: number;
      handoverToMd: number;
      transferFromCashEquivalents: number;
      categoryExpenses: PettyCashCategory[];
      remarks: string;
      cashReceivedAuto: number;
    }) => {
      if (!actor) throw new Error('Not connected');
      const createdAt = BigInt(Date.now()) * 1_000_000n;
      return actor.addPettyCash(
        params.date,
        params.openingBalance,
        params.cashFromMd,
        params.expenses,
        params.staffAdvance,
        params.handoverToMd,
        params.transferFromCashEquivalents,
        params.categoryExpenses,
        params.remarks,
        params.cashReceivedAuto,
        createdAt,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

export function useUpdatePettyCash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      originalDate: bigint;
      openingBalance: number;
      cashFromMd: number;
      expenses: number;
      staffAdvance: number;
      handoverToMd: number;
      transferFromCashEquivalents: number;
      categoryExpenses: PettyCashCategory[];
      remarks: string;
      cashReceivedAuto: number;
    }) => {
      if (!actor) throw new Error('Not connected');
      return actor.updatePettyCash(
        params.originalDate,
        params.openingBalance,
        params.cashFromMd,
        params.expenses,
        params.staffAdvance,
        params.handoverToMd,
        params.transferFromCashEquivalents,
        params.categoryExpenses,
        params.remarks,
        params.cashReceivedAuto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

export function useDeletePettyCash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (date: bigint) => {
      if (!actor) throw new Error('Not connected');
      return actor.deletePettyCash(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

export function useBulkAddPettyCash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: PettyCash[]) => {
      if (!actor) throw new Error('Not connected');
      return actor.bulkAddPettyCash(batch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

export function useGetPettyCashAttachments(date: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<PettyCashAttachment[]>({
    queryKey: ['pettyCashAttachments', date.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAttachmentsForPettyCashRecord(date);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddPettyCashAttachment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, attachment }: { date: bigint; attachment: PettyCashAttachment }) => {
      if (!actor) throw new Error('Not connected');
      return actor.addAttachmentToPettyCashRecord(date, attachment);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pettyCashAttachments', variables.date.toString()] });
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

export function useRemovePettyCashAttachment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, attachmentId }: { date: bigint; attachmentId: string }) => {
      if (!actor) throw new Error('Not connected');
      return actor.removeAttachmentFromPettyCashRecord(date, attachmentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pettyCashAttachments', variables.date.toString()] });
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

// ── Client Balances ───────────────────────────────────────────────────────────

export interface ClientBalance {
  clientName: string;
  totalRent: number;
  totalPayments: number;
  outstanding: number;
  advance: number;
}

export function useClientBalances(): ClientBalance[] {
  const { data: challans = [] } = useChallans();
  const { data: payments = [] } = usePayments();

  return React.useMemo(() => {
    const map = new Map<string, { totalRent: number; totalPayments: number }>();

    for (const challan of challans) {
      const total = challan.items.reduce((sum, item) => sum + item.quantity * item.rate * item.rentalDays, 0) + challan.freight;
      const existing = map.get(challan.clientName) || { totalRent: 0, totalPayments: 0 };
      map.set(challan.clientName, { ...existing, totalRent: existing.totalRent + total });
    }

    for (const payment of payments) {
      const existing = map.get(payment.client) || { totalRent: 0, totalPayments: 0 };
      map.set(payment.client, { ...existing, totalPayments: existing.totalPayments + payment.amount });
    }

    return Array.from(map.entries()).map(([clientName, data]) => {
      const diff = data.totalRent - data.totalPayments;
      return {
        clientName,
        totalRent: data.totalRent,
        totalPayments: data.totalPayments,
        outstanding: diff > 0 ? diff : 0,
        advance: diff < 0 ? Math.abs(diff) : 0,
      };
    }).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [challans, payments]);
}

// ── Dashboard Metrics ─────────────────────────────────────────────────────────

export function useDashboardMetrics() {
  const { data: challans = [], isLoading: challansLoading } = useChallans();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: pettyCashWithAttachments = [], isLoading: pcLoading } = usePettyCash();

  const isLoading = challansLoading || paymentsLoading || pcLoading;

  const metrics = React.useMemo(() => {
    if (isLoading) return null;
    const pettyCash = (pettyCashWithAttachments as Array<{ pettyCash: PettyCash }>).map(p => p.pettyCash);
    return calculateDashboardMetrics(challans, payments, pettyCash);
  }, [challans, payments, pettyCashWithAttachments, isLoading]);

  return { data: metrics, isLoading };
}
