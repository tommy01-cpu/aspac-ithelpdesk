'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ReorderItem {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  [key: string]: any; // Allow additional properties
}

interface ReorderListProps {
  items: ReorderItem[];
  onReorder: (reorderedItems: ReorderItem[]) => Promise<boolean>;
  type: 'service-categories' | 'service-catalog' | 'incident-catalog';
  itemRenderer?: (item: ReorderItem, index: number, moveUp: (index: number) => void, moveDown: (index: number) => void) => React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export default function ReorderList({
  items: initialItems,
  onReorder,
  type,
  itemRenderer,
  className,
  title = 'Reorder Items',
  description = 'Use arrows to reorder items'
}: ReorderListProps) {
  const [items, setItems] = useState<ReorderItem[]>(initialItems);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    // Swap items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    // Update sortOrder for all items
    const updatedItems = newItems.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1
    }));

    setItems(updatedItems);
    setHasChanges(true);
  };

  const moveItemUp = (index: number) => {
    moveItem(index, 'up');
  };

  const moveItemDown = (index: number) => {
    moveItem(index, 'down');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await onReorder(items);
      if (success) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to save reorder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setItems(initialItems);
    setHasChanges(false);
  };

  const defaultItemRenderer = (item: ReorderItem, index: number) => (
    <div className="flex items-center gap-3 p-4">
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => moveItem(index, 'up')}
          disabled={index === 0}
          className="h-6 w-6 p-0"
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => moveItem(index, 'down')}
          disabled={index === items.length - 1}
          className="h-6 w-6 p-0"
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex items-center gap-3 flex-1">
        {item.icon && (
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="text-sm">{item.icon}</span>
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{item.name}</h4>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="ml-auto">
          #{index + 1}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Order'}
            </Button>
          </div>
        )}
      </div>

      {/* Reorder List */}
      <div className="space-y-2">
        {items.map((item, index) => {
          const moveUp = (idx: number) => moveItem(idx, 'up');
          const moveDown = (idx: number) => moveItem(idx, 'down');
          
          return (
            <Card
              key={item.id}
              className={cn(
                'transition-all duration-200 hover:shadow-md',
                hasChanges && 'border-amber-200 bg-amber-50/30'
              )}
            >
              <CardContent className="p-0">
                {itemRenderer ? itemRenderer(item, index, moveUp, moveDown) : defaultItemRenderer(item, index)}
              </CardContent>
            </Card>
          );
        })}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowUp className="h-8 w-8 text-gray-400" />
            </div>
            <p>No items to reorder</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <p className="text-sm text-amber-800">
              You have unsaved changes. Click "Save Order" to apply the new arrangement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
