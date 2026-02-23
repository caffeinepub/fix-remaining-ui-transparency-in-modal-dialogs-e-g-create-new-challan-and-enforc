import { useState } from 'react';
import { useInventory, useDeleteInventoryItem } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, Trash2, Pencil, Upload } from 'lucide-react';
import InventoryFormDialog from '../components/inventory/InventoryFormDialog';
import InventoryBulkUploadDialog from '../components/inventory/InventoryBulkUploadDialog';
import QueryErrorState from '../components/common/QueryErrorState';
import type { InventoryItem } from '../backend';

export default function InventoryPage() {
  const { data: inventory = [], isLoading, error, refetch } = useInventory();
  const deleteItem = useDeleteInventoryItem();

  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async (name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteItem.mutateAsync(name);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingItem(null);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory</h1>
            <p className="text-muted-foreground mt-2">Manage your rental inventory items</p>
          </div>
        </div>
        <QueryErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-2">Manage your rental inventory items</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setBulkUploadOpen(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items
          </CardTitle>
          <CardDescription>
            {inventory.length} {inventory.length === 1 ? 'item' : 'items'} in inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inventory items yet. Add your first item to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Issued Qty</TableHead>
                  <TableHead className="text-right">Available Qty</TableHead>
                  <TableHead className="text-right">Daily Rate</TableHead>
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
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.name)}
                        disabled={deleteItem.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
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
        open={formOpen}
        onClose={handleFormClose}
        item={editingItem}
      />

      <InventoryBulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
      />
    </div>
  );
}
