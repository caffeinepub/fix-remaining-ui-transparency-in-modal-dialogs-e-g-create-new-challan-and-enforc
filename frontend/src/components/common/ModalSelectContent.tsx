import React from 'react';
import { SelectContent } from '@/components/ui/select';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function ModalSelectContent({ children, className }: Props) {
  return (
    <SelectContent
      position="popper"
      className={`z-[200] bg-popover opacity-100 ${className || ''}`}
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </SelectContent>
  );
}

// Named export for backward compatibility
export { ModalSelectContent };
