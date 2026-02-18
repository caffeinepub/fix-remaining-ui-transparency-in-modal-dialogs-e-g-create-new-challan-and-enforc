import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, FileUp, RefreshCw } from 'lucide-react';
import { useChallans, useMarkChallanReturned } from '../hooks/useQueries';
import { useMutationGate } from '../hooks/useMutationGate';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ChallanFormDialog from '../components/challans/ChallanFormDialog';
import ChallanBulkUploadDialog from '../components/challans/ChallanBulkUploadDialog';
import ChallanNewFormatBulkUploadDialog from '../components/challans/ChallanNewFormatBulkUploadDialog';
import ChallanRestoreDatesDialog from '../components/challans/ChallanRestoreDatesDialog';
import { useNavigate } from '@tanstack/react-router';
import { formatChallanRentDate } from '../utils/dates';
import { calculateChallanTotal } from '../utils/challanTotals';
import { toast } from 'sonner';
import QueryErrorState from '../components/common/QueryErrorState';
import { normalizeError } from '../utils/errors';
import SignInRequiredDialog from '../components/common/SignInRequiredDialog';

export default function ChallansPage() {
  const navigate = useNavigate();
  const { data: challans, isLoading, error, refetch } = useChallans();
  const markReturned = useMarkChallanReturned();
  const mutationGate = useMutationGate();
  const { canBulkUpload, disabledReason } = useStaffRestrictions();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [showNewFormatBulkUploadDialog, setShowNewFormatBulkUploadDialog] = useState(false);
  const [showRestoreDatesDialog, setShowRestoreDatesDialog] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);

  const handleMarkReturned = async (id: string) => {
    if (!mutationGate.isReady) {
      if (!mutationGate.isAuthenticated) {
        setShowSignInDialog(true);
        return;
      }
      toast.error(mutationGate.message || 'System is not ready');
      return;
    }

    try {
      await markReturned.mutateAsync(id);
      toast.success('Challan marked as returned');
    } catch (error) {
      toast.error(normalizeError(error));
    }
  };

  const handleBulkUploadClick = () => {
    if (!canBulkUpload) {
      toast.error(disabledReason || 'Bulk upload is not available');
      return;
    }
    setShowBulkUploadDialog(true);
  };

  const handleNewFormatBulkUploadClick = () => {
    if (!canBulkUpload) {
      toast.error(disabledReason || 'Bulk upload is not available');
      return;
    }
    setShowNewFormatBulkUploadDialog(true);
  };

  const handleRestoreDatesClick = () => {
    if (!canBulkUpload) {
      toast.error(disabledReason || 'Restore dates is not available');
      return;
    }
    setShowRestoreDatesDialog(true);
  };

  if (error) {
    return <QueryErrorState error={error} onRetry={refetch} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-64 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  const isActionDisabled = !mutationGate.isReady || markReturned.isPending;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Challans</h1>
            <p className="text-sm text-gray-600 mt-1">Manage rental challans</p>
          </div>
          <div className="flex gap-2">
            {canBulkUpload && (
              <>
                <Button onClick={handleRestoreDatesClick} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restore Dates
                </Button>
                <Button onClick={handleBulkUploadClick} variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </Button>
                <Button onClick={handleNewFormatBulkUploadClick} variant="outline">
                  <FileUp className="mr-2 h-4 w-4" />
                  Bulk Upload (New Format)
                </Button>
              </>
            )}
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Challan
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Rent Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challans && challans.length > 0 ? (
                challans.map((challan) => {
                  const total = calculateChallanTotal(challan);

                  return (
                    <TableRow
                      key={challan.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate({ to: `/challans/${challan.id}` })}
                    >
                      <TableCell className="font-medium">{challan.id}</TableCell>
                      <TableCell>{challan.clientName}</TableCell>
                      <TableCell>{challan.venue}</TableCell>
                      <TableCell>{formatChallanRentDate(challan.rentDate)}</TableCell>
                      <TableCell>{challan.numberOfDays}</TableCell>
                      <TableCell>{challan.items.length}</TableCell>
                      <TableCell>₹{total.toFixed(2)}</TableCell>
                      <TableCell>
                        {challan.returned ? (
                          <Badge variant="secondary">Returned</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {!challan.returned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkReturned(challan.id)}
                            disabled={isActionDisabled}
                          >
                            Mark Returned
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">Locked</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500">
                    No challans found. Create your first challan to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ChallanFormDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
      {canBulkUpload && (
        <>
          <ChallanBulkUploadDialog
            open={showBulkUploadDialog}
            onClose={() => setShowBulkUploadDialog(false)}
            existingChallans={challans || []}
          />
          <ChallanNewFormatBulkUploadDialog
            open={showNewFormatBulkUploadDialog}
            onClose={() => setShowNewFormatBulkUploadDialog(false)}
          />
          <ChallanRestoreDatesDialog
            open={showRestoreDatesDialog}
            onClose={() => setShowRestoreDatesDialog(false)}
          />
        </>
      )}

      <SignInRequiredDialog
        open={showSignInDialog}
        onClose={() => setShowSignInDialog(false)}
      />
    </>
  );
}
