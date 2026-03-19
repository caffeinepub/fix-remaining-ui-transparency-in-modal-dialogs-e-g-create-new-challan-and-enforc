import { SelectContent } from "@/components/ui/select";
import type React from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function ModalSelectContent({ children, className }: Props) {
  return (
    <SelectContent
      position="popper"
      className={`z-[200] bg-popover opacity-100 ${className || ""}`}
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </SelectContent>
  );
}

// Named export for backward compatibility
export { ModalSelectContent };
