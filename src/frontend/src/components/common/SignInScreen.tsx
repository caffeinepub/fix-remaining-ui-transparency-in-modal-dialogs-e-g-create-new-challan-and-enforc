import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn } from 'lucide-react';

/**
 * Full-page sign-in screen prompting the user to authenticate with Internet Identity.
 */
export default function SignInScreen() {
  const { login, loginStatus, loginError } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">RENTIQ</CardTitle>
          <CardDescription>Sign in to access your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            This application requires authentication. Please sign in using Internet Identity to continue.
          </p>

          {loginError && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
              {loginError.message}
            </div>
          )}

          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full"
            size="lg"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In with Internet Identity
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Internet Identity uses secure passkeys and supports Google, Apple, and Microsoft sign-in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
