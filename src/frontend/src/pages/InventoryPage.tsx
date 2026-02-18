import { useState } from 'react';
import { useInventory } from '../hooks/useQueries';
import { useMutationGate } from '../hooks/useMutationGate';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Upload, Loader2, Pencil, Package } from 'lucide-react';
import InventoryFormDialog from '../components/inventory/InventoryFormDialog';
import InventoryBulkUploadDialog from '../components/inventory/InventoryBulkUploadDialog';
import QueryErrorState from '../components/common/QueryErrorState';
import SignInRequiredDialog from '../components/common/SignInRequiredDialog';
import { toast } from 'sonner';
import type { InventoryItem } from '../backend';

export default function InventoryPage() {
  const { data: inventory = [], isLoading, error, refetch } = useInventory();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);

  const { canMutate, reason } = useMutationGate();
  const { canBulkUpload, disabledReason } = useStaffRestrictions();

  const handleEdit = (item: InventoryItem) => {
    if (!canMutate) {
      if (reason === 'auth') {
        setShowSignInDialog(true);
      }
      return;
    }
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleAddClick = () => {
    if (!canMutate) {
      if (reason === 'auth') {
        setShowSignInDialog(true);
      }
      return;
    }
    setIsAddDialogOpen(true);
  };

  const handleBulkUploadClick = () => {
    if (!canMutate) {
      if (reason === 'auth') {
        setShowSignInDialog(true);
      }
      return;
    }
    if (!canBulkUpload) {
      toast.error(disabledReason || 'Bulk upload is not available');
      return;
    }
    setIsBulkUploadOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <QueryErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-2">Manage your rental inventory items</p>
        </div>
        <div className="flex gap-2">
          {canBulkUpload && (
            <Button onClick={handleBulkUploadClick} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
          )}
          <Button onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>View and manage all inventory items</CardDescription>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inventory items found</p>
              <p className="text-sm mt-2">Add your first item to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Total Quantity</TableHead>
                  <TableHead className="text-right">Issued Quantity</TableHead>
                  <TableHead className="text-right">Available Quantity</TableHead>
                  <TableHead className="text-right">Daily Rate (₹)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.totalQuantity}</TableCell>
                    <TableCell className="text-right">{item.issuedQuantity}</TableCell>
                    <TableCell className="text-right">{item.availableQuantity}</TableCell>
                    <TableCell className="text-right">₹{item.dailyRate.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InventoryFormDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />

      {editingItem && (
        <InventoryFormDialog
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          item={editingItem}
        />
      )}

      {canBulkUpload && (
        <InventoryBulkUploadDialog
          open={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
        />
      )}

      <SignInRequiredDialog
        open={showSignInDialog}
        onClose={() => setShowSignInDialog(false)}
      />
    </div>
  );
}
