// OCI OIDC configuration for react-oidc-context.
// Fill in the two REPLACE_ placeholders before deploying to prod.
// Scopes must match what you registered in OCI IAM (Step 7 will confirm
// whether the scope claim arrives as "read" or "mytodolist-api.read").

const onSigninCallback = () => {
  // Remove the OIDC code/state params from the URL after sign-in completes.
  globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
};

export const ociAuthConfig = {
  authority: 'https://idcs-51b2f6e16d974aedba8f49fa2dce9503.identity.oraclecloud.com',
  client_id: '2cc2c70123b74e258a167a9a263a3124',
  redirect_uri: globalThis.location.origin,
  scope: 'openid profile email mytodolist-apiread mytodolist-apiadmin',
  onSigninCallback,
};
