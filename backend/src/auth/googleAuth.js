import { OAuth2Client } from 'google-auth-library';

export function createGoogleClient(clientId) {
  return new OAuth2Client(clientId);
}

export async function verifyGoogleToken(client, idToken, audience) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error('Google token missing email');
  }

  return {
    email: payload.email.toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || null,
    picture: payload.picture || null,
  };
}
