import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

/**
 * Access management page removed (authentication system disabled).
 */
export default function AccessManagementPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Management Disabled</AlertTitle>
        <AlertDescription>
          The access management system has been disabled. All users now have full access to the application.
        </AlertDescription>
      </Alert>
    </div>
  );
}
