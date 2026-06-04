// OCI OIDC configuration for react-oidc-context.
// Fill in the two REPLACE_ placeholders before deploying to prod.
// Scopes must match what you registered in OCI IAM (Step 7 will confirm
// whether the scope claim arrives as "read" or "mytodolist-api.read").

const onSigninCallback = () => {
  // Remove the OIDC code/state params from the URL after sign-in completes.
  window.history.replaceState({}, document.title, window.location.pathname);
};

export const ociAuthConfig = {
  authority: 'REPLACE_WITH_OCI_ISSUER_URL',
  client_id: 'REPLACE_WITH_OCI_CLIENT_ID',
  redirect_uri: window.location.origin,
  scope: 'openid',
  onSigninCallback,
};
