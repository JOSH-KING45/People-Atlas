export function googleConnection(savedClientId = '') {
  const sharedClientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
  return {
    googleClientId:sharedClientId || savedClientId,
    googleManaged:!!sharedClientId
  };
}
