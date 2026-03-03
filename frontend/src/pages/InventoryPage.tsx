import React, { useState } from 'react';
import { useInventory, useDeleteInventoryItem } from '../hooks/useQueries';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Upload, Trash2, Edit, Package } from 'lucide-react';
import { toast } from 'sonner';
import InventoryFormDialog from '../components/inventory/InventoryFormDialog';
import InventoryBulkUploadDialog from '../components/inventory/InventoryBulkUploadDialog';
import type { InventoryItem } from '../backend';

export default function InventoryPage() {
  const { data: inventory = [], isLoading } = useInventory();
  const { staffRestricted } = useStaffRestrictions();
  const deleteItem = useDeleteInventoryItem();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const handleDelete = (name: string) => {
    if (!confirm(`Delete "${name}" from inventory?`)) return;
    deleteItem.mutate(name, {
      onSuccess: () => toast.success('Item deleted'),
      onError: (e) => toast.error(`Delete failed: ${e.message}`),
    });
  };

  const handleEdit = (item: InventoryItem) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{inventory.length} items</p>
        </div>
        <div className="flex gap-2">
          {!staffRestricted && (
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              Bulk Upload
            </Button>
          )}
          {!staffRestricted && (
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No inventory items</p>
          <p className="text-sm">Add items to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Daily Rate</TableHead>
                {!staffRestricted && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.totalQuantity}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.issuedQuantity > 0 ? 'secondary' : 'outline'} className="text-xs">
                      {item.issuedQuantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.availableQuantity > 0 ? 'default' : 'destructive'} className="text-xs">
                      {item.availableQuantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">₹{item.dailyRate}/day</TableCell>
                  {!staffRestricted && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.name)}
                          disabled={deleteItem.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InventoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        existingItems={inventory}
      />
      <InventoryBulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} existingItems={inventory} />
    </div>
  );
}
