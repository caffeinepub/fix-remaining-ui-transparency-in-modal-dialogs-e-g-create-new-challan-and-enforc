import React, { useState } from 'react';
import { useChallans, useDeleteChallan, useMarkChallanReturned } from '../hooks/useQueries';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import { useAppNav } from '../App';
import { nanoToDate, formatDate } from '../utils/dates';
import { calcChallanTotal } from '../utils/challanTotals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Upload, Trash2, Eye, RotateCcw, Search, FileText, Lock } from 'lucide-react';
import { toast } from 'sonner';
import ChallanFormDialog from '../components/challans/ChallanFormDialog';
import ChallanEditDialog from '../components/challans/ChallanEditDialog';
import { ChallanBulkUploadDialog } from '../components/challans/ChallanBulkUploadDialog';
import { ChallanNewFormatBulkUploadDialog } from '../components/challans/ChallanNewFormatBulkUploadDialog';
import ChallanRestoreDatesDialog from '../components/challans/ChallanRestoreDatesDialog';
import type { Challan } from '../backend';

export default function ChallansPage() {
  const { data: challans = [], isLoading } = useChallans();
  const { staffRestricted, canDelete } = useStaffRestrictions();
  const deleteChallan = useDeleteChallan();
  const markReturned = useMarkChallanReturned();
  const { navigate } = useAppNav();

  const [createOpen, setCreateOpen] = useState(false);
  const [editChallan, setEditChallan] = useState<Challan | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [newFormatOpen, setNewFormatOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = challans.filter(c =>
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.clientName.toLowerCase().includes(search.toLowerCase()) ||
    (c.venue || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => Number(b.rentDate - a.rentDate));

  const handleDelete = (id: string) => {
    if (!confirm(`Delete challan ${id}?`)) return;
    deleteChallan.mutate(id, {
      onSuccess: () => toast.success('Challan deleted'),
      onError: (e) => toast.error(`Delete failed: ${e.message}`),
    });
  };

  const handleMarkReturned = (id: string) => {
    if (!confirm(`Mark challan ${id} as returned? This cannot be undone.`)) return;
    markReturned.mutate(id, {
      onSuccess: () => toast.success('Challan marked as returned'),
      onError: (e) => toast.error(`Failed: ${e.message}`),
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Challans</h1>
          <p className="text-sm text-muted-foreground">{challans.length} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!staffRestricted && (
            <>
              <Button variant="outline" size="sm" onClick={() => setRestoreOpen(true)}>
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Restore Dates
              </Button>
              <Button variant="outline" size="sm" onClick={() => setNewFormatOpen(true)}>
                <Upload className="w-4 h-4 mr-1.5" />
                New Format
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                <Upload className="w-4 h-4 mr-1.5" />
                Bulk Upload
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Challan
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by ID, client, venue..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No challans found</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Rent Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((challan) => (
                <TableRow key={challan.id} className={challan.returned ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-xs font-medium">{challan.id}</TableCell>
                  <TableCell>{challan.clientName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{challan.venue || '—'}</TableCell>
                  <TableCell className="text-sm">{formatDate(nanoToDate(challan.rentDate))}</TableCell>
                  <TableCell>
                    {challan.returned ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Lock className="w-2.5 h-2.5" /> Returned
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{calcChallanTotal(challan.items, challan.freight).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => navigate('challan-detail', { id: challan.id })}
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {!challan.returned && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => setEditChallan(challan)}
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      )}
                      {!challan.returned && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => handleMarkReturned(challan.id)}
                          title="Mark Returned"
                          disabled={markReturned.isPending}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canDelete && !challan.returned && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(challan.id)}
                          disabled={deleteChallan.isPending}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ChallanFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editChallan && (
        <ChallanEditDialog
          open={!!editChallan}
          onClose={() => setEditChallan(null)}
          challan={editChallan}
        />
      )}

      {!staffRestricted && (
        <>
          <ChallanBulkUploadDialog
            open={bulkOpen}
            onClose={() => setBulkOpen(false)}
            existingChallans={challans}
          />
          <ChallanNewFormatBulkUploadDialog
            open={newFormatOpen}
            onClose={() => setNewFormatOpen(false)}
            existingChallans={challans}
          />
          <ChallanRestoreDatesDialog
            open={restoreOpen}
            onClose={() => setRestoreOpen(false)}
          />
        </>
      )}
    </div>
  );
}
