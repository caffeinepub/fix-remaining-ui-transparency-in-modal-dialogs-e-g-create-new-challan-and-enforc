import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useTodayKey } from './useTodayKey';
import { dateToNano } from '../utils/dates';
import { calculateChallanTotal } from '../utils/challanTotals';
import { calculateDailyMetrics, calculateMonthlyMetrics, calculateAllTimeMetrics, calculateFutureMetrics } from '../utils/dashboardMetrics';
import type {
  InventoryItem,
  Challan,
  Payment,
  PettyCash,
  Client,
  UserProfile,
  BulkChallanCreateResult,
  PaymentBulkCreateResult,
  PettyCashBulkCreateResult,
  ClientBulkCreateResult,
  InventoryBulkCreateResult,
  BuildMetadata,
  PettyCashAttachment,
  PettyCashWithAttachments,
} from '../backend';

// Inventory Queries
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
    mutationFn: async (item: { name: string; totalQuantity: number; dailyRate: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addInventoryItem(item.name, item.totalQuantity, item.dailyRate);
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
    mutationFn: async (item: { name: string; totalQuantity: number; dailyRate: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateInventoryItem(item.name, item.totalQuantity, item.dailyRate);
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
      if (!actor) throw new Error('Actor not available');
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
    mutationFn: async (items: InventoryItem[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bulkCreateInventoryItems(items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// Challan Queries
export function useChallans() {
  const { actor, isFetching } = useActor();
  const todayKey = useTodayKey();

  return useQuery<Challan[]>({
    queryKey: ['challans', todayKey],
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
    mutationFn: async (challan: {
      id: string;
      clientName: string;
      venue: string;
      items: Array<{ itemName: string; quantity: number; rate: number; rentalDays: number }>;
      freight: number;
      numberOfDays: number;
      rentDate: bigint;
      site: string;
      creationDate: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createChallan(
        challan.id,
        challan.clientName,
        challan.venue,
        challan.items,
        challan.freight,
        challan.numberOfDays,
        challan.rentDate,
        challan.site,
        challan.creationDate
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useUpdateChallan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challan: {
      id: string;
      clientName: string;
      venue: string;
      items: Array<{ itemName: string; quantity: number; rate: number; rentalDays: number }>;
      freight: number;
      numberOfDays: number;
      rentDate: bigint;
      site: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateChallan(
        challan.id,
        challan.clientName,
        challan.venue,
        challan.items,
        challan.freight,
        challan.numberOfDays,
        challan.rentDate,
        challan.site
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useDeleteChallan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteChallan(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useMarkChallanReturned() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markChallanReturned(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useBulkCreateChallans() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challans: Challan[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createBulkChallans(challans);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useRestoreChallanDates() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challans: Challan[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateChallanRentDates(challans);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

// Payment Queries
export function usePayments() {
  const { actor, isFetching } = useActor();
  const todayKey = useTodayKey();

  return useQuery<Payment[]>({
    queryKey: ['payments', todayKey],
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
    mutationFn: async (payment: {
      id: string;
      date: bigint;
      client: string;
      mode: string;
      amount: number;
      referenceNumber: string;
      site: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const createdAt = dateToNano(new Date());
      return actor.addPayment(
        payment.id,
        payment.date,
        payment.client,
        payment.mode,
        payment.amount,
        payment.referenceNumber,
        createdAt,
        payment.site
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['cashReceived'] });
    },
  });
}

export function useBulkAddPayments() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payments: Payment[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bulkAddPayments(payments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['cashReceived'] });
    },
  });
}

// Petty Cash Queries
export function usePettyCash() {
  const { actor, isFetching } = useActor();
  const todayKey = useTodayKey();

  return useQuery<PettyCashWithAttachments[]>({
    queryKey: ['pettyCash', todayKey],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPettyCashRecordsWithAttachments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCashReceivedForDate(date: bigint) {
  const { actor, isFetching } = useActor();
  const { data: payments } = usePayments();

  return useQuery<number>({
    queryKey: ['cashReceived', date.toString()],
    queryFn: async () => {
      if (!actor || !payments) return 0;
      
      // Filter payments for the given date and mode = CASH
      const cashPayments = payments.filter((payment) => {
        const isSameDate = payment.date === date;
        const isCash = payment.mode.toUpperCase() === 'CASH';
        return isSameDate && isCash;
      });

      // Sum the amounts
      const total = cashPayments.reduce((sum, payment) => sum + payment.amount, 0);
      return total;
    },
    enabled: !!actor && !isFetching && !!payments,
  });
}

export function useAddPettyCash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: {
      date: bigint;
      openingBalance: number;
      cashFromMd: number;
      expenses: number;
      staffAdvance: number;
      handoverToMd: number;
      netChange: number;
      closingBalance: number;
      transferFromCashEquivalents: number;
      categoryExpenses: Array<{ title: string; amount: number }>;
      remarks: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const createdAt = dateToNano(new Date());
      return actor.addPettyCash(
        record.date,
        record.openingBalance,
        record.cashFromMd,
        record.expenses,
        record.staffAdvance,
        record.handoverToMd,
        record.netChange,
        record.closingBalance,
        record.transferFromCashEquivalents,
        record.categoryExpenses,
        record.remarks,
        createdAt
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
    mutationFn: async (record: {
      originalDate: bigint;
      openingBalance: number;
      cashFromMd: number;
      expenses: number;
      staffAdvance: number;
      handoverToMd: number;
      netChange: number;
      closingBalance: number;
      transferFromCashEquivalents: number;
      categoryExpenses: Array<{ title: string; amount: number }>;
      remarks: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePettyCash(
        record.originalDate,
        record.openingBalance,
        record.cashFromMd,
        record.expenses,
        record.staffAdvance,
        record.handoverToMd,
        record.netChange,
        record.closingBalance,
        record.transferFromCashEquivalents,
        record.categoryExpenses,
        record.remarks
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
      if (!actor) throw new Error('Actor not available');
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
    mutationFn: async (records: PettyCash[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bulkAddPettyCash(records);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
    },
  });
}

// Petty Cash Attachments
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
      if (!actor) throw new Error('Actor not available');
      return actor.addAttachmentToPettyCashRecord(date, attachment);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pettyCashAttachments', variables.date.toString()] });
    },
  });
}

export function useRemovePettyCashAttachment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, attachmentId }: { date: bigint; attachmentId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeAttachmentFromPettyCashRecord(date, attachmentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pettyCashAttachments', variables.date.toString()] });
    },
  });
}

export function useClearPettyCashAttachments() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.clearPettyCashAttachments(date);
    },
    onSuccess: (_, date) => {
      queryClient.invalidateQueries({ queryKey: ['pettyCashAttachments', date.toString()] });
    },
  });
}

// Client Queries
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
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      const createdAt = dateToNano(new Date());
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
      if (!actor) throw new Error('Actor not available');
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
    mutationFn: async (clients: Client[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bulkCreateClients(clients);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Dashboard Metrics
export function useDashboardMetrics() {
  const { data: challans = [] } = useChallans();
  const { data: payments = [] } = usePayments();
  const { data: pettyCashWithAttachments = [] } = usePettyCash();
  const todayKey = useTodayKey();

  return useQuery({
    queryKey: ['dashboardMetrics', todayKey],
    queryFn: () => {
      // Extract PettyCash objects from PettyCashWithAttachments
      const pettyCash = pettyCashWithAttachments.map((pc) => pc.pettyCash);

      const daily = calculateDailyMetrics(challans, payments, pettyCash);
      const monthly = calculateMonthlyMetrics(challans, payments, pettyCash);
      const allTime = calculateAllTimeMetrics(challans, payments, pettyCash);
      const future = calculateFutureMetrics(challans);

      return {
        daily,
        monthly,
        allTime,
        future,
      };
    },
    enabled: challans.length > 0 || payments.length > 0,
  });
}

// Client Balances
export function useClientBalances() {
  const { data: challans = [] } = useChallans();
  const { data: payments = [] } = usePayments();
  const { data: clients = [] } = useClients();

  return useQuery({
    queryKey: ['clientBalances'],
    queryFn: () => {
      const balanceMap = new Map<string, { totalRent: number; totalPayments: number; balance: number }>();

      // Calculate total rent from challans
      for (const challan of challans) {
        const total = calculateChallanTotal(challan);
        const existing = balanceMap.get(challan.clientName) || { totalRent: 0, totalPayments: 0, balance: 0 };
        existing.totalRent += total;
        balanceMap.set(challan.clientName, existing);
      }

      // Calculate total payments
      for (const payment of payments) {
        const existing = balanceMap.get(payment.client) || { totalRent: 0, totalPayments: 0, balance: 0 };
        existing.totalPayments += payment.amount;
        balanceMap.set(payment.client, existing);
      }

      // Calculate balances
      for (const [client, data] of balanceMap.entries()) {
        data.balance = data.totalRent - data.totalPayments;
      }

      // Include all clients, even those with no transactions
      for (const client of clients) {
        if (!balanceMap.has(client.name)) {
          balanceMap.set(client.name, { totalRent: 0, totalPayments: 0, balance: 0 });
        }
      }

      return Array.from(balanceMap.entries()).map(([name, data]) => ({
        clientName: name,
        ...data,
      }));
    },
    enabled: challans.length > 0 || payments.length > 0 || clients.length > 0,
  });
}

// Build Metadata
export function useBuildMetadata() {
  const { actor, isFetching } = useActor();

  return useQuery<BuildMetadata>({
    queryKey: ['buildMetadata'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getBuildMetadata();
    },
    enabled: !!actor && !isFetching,
    staleTime: Infinity,
  });
}
