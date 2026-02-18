import { useParams, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Printer, Lock } from 'lucide-react';
import { useChallans, useDeleteChallan } from '../hooks/useQueries';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import { formatChallanRentDate } from '../utils/dates';
import { calculateChallanTotal, calculateItemTotal } from '../utils/challanTotals';
import ChallanEditDialog from '../components/challans/ChallanEditDialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { normalizeError } from '../utils/errors';

export default function ChallanDetailPage() {
  const { challanId } = useParams({ from: '/challans/$challanId' });
  const navigate = useNavigate();
  const { data: challans, isLoading } = useChallans();
  const deleteChallan = useDeleteChallan();
  const { canDelete, disabledReason } = useStaffRestrictions();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const challan = challans?.find((c) => c.id === challanId);

  const handleDelete = async () => {
    if (!challan) return;

    if (challan.returned) {
      toast.error('Returned challans are locked and cannot be deleted.');
      return;
    }

    if (!canDelete) {
      toast.error(disabledReason || 'Delete action is not available');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete challan ${challan.id}?`)) {
      try {
        await deleteChallan.mutateAsync(challan.id);
        toast.success('Challan deleted successfully');
        navigate({ to: '/challans' });
      } catch (error) {
        toast.error(normalizeError(error));
      }
    }
  };

  const handleEdit = () => {
    if (challan?.returned) {
      toast.error('Returned challans are locked and cannot be edited.');
      return;
    }
    setShowEditDialog(true);
  };

  const handlePrint = () => {
    navigate({ to: `/challans/${challanId}/print` });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/challans' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Challans
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Challan not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = calculateChallanTotal(challan);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate({ to: '/challans' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Challans
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          {!challan.returned ? (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              {canDelete && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2 bg-gray-100 rounded-md">
              <Lock className="h-4 w-4" />
              <span>Returned challans are locked</span>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Challan Details: {challan.id}</CardTitle>
            {challan.returned ? (
              <Badge variant="secondary">Returned</Badge>
            ) : (
              <Badge>Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Client Name</p>
              <p className="text-lg font-semibold">{challan.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Venue</p>
              <p className="text-lg font-semibold">{challan.venue}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rent Date</p>
              <p className="text-lg font-semibold">{formatChallanRentDate(challan.rentDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Number of Days</p>
              <p className="text-lg font-semibold">{challan.numberOfDays}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Site</p>
              <p className="text-lg font-semibold">{challan.site || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Freight</p>
              <p className="text-lg font-semibold">₹{challan.freight.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Items</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Rental Days</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challan.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                      <TableCell>{item.rentalDays}</TableCell>
                      <TableCell>₹{calculateItemTotal(item).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="space-y-2 w-64">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">
                  ₹{challan.items.reduce((sum, item) => sum + calculateItemTotal(item), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Freight:</span>
                <span className="font-semibold">₹{challan.freight.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-lg font-bold">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showEditDialog && (
        <ChallanEditDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          challan={challan}
        />
      )}
    </div>
  );
}
