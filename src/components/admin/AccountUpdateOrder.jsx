
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { localDb } from '../utils/LocalDb';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AccountUpdateOrder({ onUpdate }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const settings = localDb.list('AppSettings')[0] || {};
    const accounts = localDb.list('Account') || [];
    const activeLoans = (localDb.list('AutoLoan') || []).filter(loan => loan.current_balance > 0);

    // Map accounts and loans to a common structure
    const mappedAccounts = accounts.map(acc => ({ ...acc, type: 'account' }));
    const mappedLoans = activeLoans.map(loan => ({ ...loan, type: 'loan' }));
    
    // Combine all items (accounts and loans)
    const allItems = [...mappedAccounts, ...mappedLoans];
    
    const savedOrder = settings.accountUpdateOrder || [];

    // Sort items based on the saved order, putting new items (not in savedOrder) at the end
    const sortedItems = [...allItems].sort((a, b) => {
      const indexA = savedOrder.indexOf(a.id);
      const indexB = savedOrder.indexOf(b.id);

      // If both are new (not in savedOrder), maintain their original relative order
      if (indexA === -1 && indexB === -1) return 0;
      // If 'a' is new, it goes after 'b'
      if (indexA === -1) return 1;
      // If 'b' is new, it goes after 'a'
      if (indexB === -1) return -1;
      // Both are in savedOrder, sort by their order
      return indexA - indexB;
    });
    
    setItems(sortedItems);
  }, []);

  const onDragEnd = useCallback((result) => {
    if (!result.destination) return;
    
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    
    setItems(newItems);
  }, [items]);

  const handleSaveOrder = useCallback(() => {
    const newOrder = items.map(item => item.id);
    const appSettings = localDb.list('AppSettings')[0];
    
    if (appSettings) {
      localDb.update('AppSettings', appSettings.id, { accountUpdateOrder: newOrder });
      // Call the onUpdate prop if provided
      if (onUpdate) {
        onUpdate();
      }
    } else {
      console.error("App settings not found. Cannot save order.");
    }
  }, [items, onUpdate]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Bulk Update Order</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        Drag and drop the accounts and loans below to set the order for the end-of-month bulk update modal.
      </p>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="accounts">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 rounded-lg border p-3">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center justify-between p-3 rounded-md transition-shadow ${
                        snapshot.isDragging ? 'shadow-lg bg-[var(--accent)]' : 'bg-[var(--background)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <span>{item.name}</span>
                        {item.type === 'loan' && <Badge variant="secondary">Loan</Badge>}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <div className="flex justify-end pt-2">
        <Button onClick={handleSaveOrder}>
          Save Order
        </Button>
      </div>
    </div>
  );
}
