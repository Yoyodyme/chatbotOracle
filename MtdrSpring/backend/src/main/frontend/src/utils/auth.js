import { useAuth } from 'react-oidc-context';

export function useCurrentUser() {
  const { user } = useAuth();
  const profile = user?.profile ?? {};
  return {
    sub:   profile.sub   ?? null,
    name:  profile.name  ?? profile.preferred_username ?? null,
    email: profile.email ?? null,
  };
}

export function useSignOut() {
  const auth = useAuth();
  return () => auth.signoutRedirect();
}
