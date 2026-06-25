import { SignJWT } from 'jose';

// Минтим короткоживущий JWT (HS256) на общем секрете API_GATEWAY_SECRET.
// api-gateway верифицирует его своим JwtAuthGuard и берёт sub как userId.
export async function mintGatewayToken(userId: string): Promise<string> {
  const secret = process.env.API_GATEWAY_SECRET;
  if (!secret) {
    throw new Error('API_GATEWAY_SECRET is not set');
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));
}
