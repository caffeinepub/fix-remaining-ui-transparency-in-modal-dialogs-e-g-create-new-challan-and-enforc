import React, { useState } from 'react';
import { useChallans, useDeleteChallan, useMarkChallanReturned } from '../hooks/useQueries';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import { useAppNav } from '../App';
import { formatChallanRentDate, nanoToDate, formatDate, addDays } from '../utils/dates';
import { calculateChallanTotal, calculateItemTotal } from '../utils/challanTotals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Printer, Lock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import ChallanEditDialog from '../components/challans/ChallanEditDialog';
import type { Challan } from '../backend';

interface Props {
  challanId: string;
}

export default function ChallanDetailPage({ challanId }: Props) {
  const { data: challans = [], isLoading } = useChallans();
  const { canDelete } = useStaffRestrictions();
  const deleteChallan = useDeleteChallan();
  const markReturned = useMarkChallanReturned();
  const { navigate } = useAppNav();
  const [editOpen, setEditOpen] = useState(false);

  const challan = challans.find(c => c.id === challanId);

  const handleDelete = () => {
    if (!challan) return;
    if (!confirm(`Delete challan ${challan.id}? This cannot be undone.`)) return;
    deleteChallan.mutate(challan.id, {
      onSuccess: () => { toast.success('Challan deleted'); navigate('challans'); },
      onError: (e) => toast.error(`Delete failed: ${e.message}`),
    });
  };

  const handleMarkReturned = () => {
    if (!challan) return;
    if (!confirm(`Mark challan ${challan.id} as returned? This cannot be undone.`)) return;
    markReturned.mutate(challan.id, {
      onSuccess: () => toast.success('Challan marked as returned'),
      onError: (e) => toast.error(`Failed: ${e.message}`),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted mb-4" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate('challans')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Challans
        </Button>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Challan not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = calculateChallanTotal(challan);
  const rentDate = nanoToDate(challan.rentDate);
  const returnDate = addDays(rentDate, challan.numberOfDays);

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('challans')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('challan-print', { id: challan.id })}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          {!challan.returned && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleMarkReturned} disabled={markReturned.isPending}>
                <RotateCcw className="mr-2 h-4 w-4" /> Mark Returned
              </Button>
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteChallan.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
            </>
          )}
          {challan.returned && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 bg-muted rounded-md">
              <Lock className="h-4 w-4" /> Returned & Locked
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Challan: {challan.id}</CardTitle>
            <Badge variant={challan.returned ? 'secondary' : 'default'}>
              {challan.returned ? 'Returned' : 'Active'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="font-semibold">{challan.clientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Venue</p>
              <p className="font-semibold">{challan.venue || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Site</p>
              <p className="font-semibold">{challan.site || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rent Date</p>
              <p className="font-semibold">{formatChallanRentDate(challan.rentDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Return Date</p>
              <p className="font-semibold">{formatDate(returnDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Number of Days</p>
              <p className="font-semibold">{challan.numberOfDays}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate/Day</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challan.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.rentalDays}</TableCell>
                      <TableCell className="text-right">₹{calculateItemTotal(item).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="space-y-2 w-56">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{challan.items.reduce((s, i) => s + calculateItemTotal(i), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Freight:</span>
                <span>₹{challan.freight.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {editOpen && !challan.returned && (
        <ChallanEditDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          challan={challan}
        />
      )}
    </div>
  );
}
