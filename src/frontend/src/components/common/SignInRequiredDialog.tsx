interface SignInRequiredDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Disabled sign-in dialog (authentication removed).
 */
export default function SignInRequiredDialog({ open, onClose }: SignInRequiredDialogProps) {
  return null;
}
