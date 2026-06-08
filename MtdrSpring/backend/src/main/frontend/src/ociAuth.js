// OCI OIDC configuration for react-oidc-context.
// Fill in the two REPLACE_ placeholders before deploying to prod.
// Scopes must match what you registered in OCI IAM (Step 7 will confirm
// whether the scope claim arrives as "read" or "mytodolist-api.read").

const onSigninCallback = () => {
  // Remove the OIDC code/state params from the URL after sign-in completes.
  globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
};

export const ociAuthConfig = {
  authority: 'https://idcs-51b2f6e16d974aedba8f49fa2dce9503.identity.oraclecloud.com:443/oauth2/v1',
  client_id: 'cc728b78e0b44f7f8346b44f4f6fe110',
  redirect_uri: globalThis.location.origin,
  scope: 'openid',
  onSigninCallback,
};
