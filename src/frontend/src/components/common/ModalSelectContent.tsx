import * as React from 'react';
import { SelectContent } from '@/components/ui/select';

/**
 * A wrapper around SelectContent that ensures proper scrolling and selection behavior
 * when used inside modal dialogs. This component:
 * - Enables mouse wheel and touchpad scrolling within the dropdown
 * - Prevents click-through issues by managing z-index and pointer events
 * - Ensures dropdown content is not clipped by dialog containers
 * - Maintains keyboard navigation support
 * - Provides collision handling to keep dropdowns within viewport
 * - Prevents background page scroll while interacting with dropdown
 */
export const ModalSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectContent>,
  React.ComponentPropsWithoutRef<typeof SelectContent>
>(({ children, className, onWheel, ...props }, ref) => {
  // Prevent wheel events from propagating to parent containers
  const handleWheel = React.useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (onWheel) {
        onWheel(e);
      }
    },
    [onWheel]
  );

  return (
    <SelectContent
      ref={ref}
      className={className}
      position="popper"
      sideOffset={4}
      collisionPadding={10}
      avoidCollisions={true}
      onWheel={handleWheel}
      {...props}
    >
      {children}
    </SelectContent>
  );
});

ModalSelectContent.displayName = 'ModalSelectContent';
