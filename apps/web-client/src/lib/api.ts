import type {
  ExposureResult,
  ParcelDetailResponse,
  ParcelResponse,
  ProductSearchResponse,
  RecipientResponse,
  ReviewResponse,
} from '@banderoli/contracts';
import { mintGatewayToken } from './gateway-token';

const BASE_URL = process.env.API_GATEWAY_URL ?? 'http://localhost:3001';

async function gatewayGet<T>(userId: string, path: string): Promise<T> {
  const token = await mintGatewayToken(userId);

  const response = await fetch(`${BASE_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gateway GET ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function listRecipients(userId: string): Promise<RecipientResponse[]> {
  return gatewayGet<RecipientResponse[]>(userId, '/recipients');
}

export function listParcels(userId: string, recipientId?: string): Promise<ParcelResponse[]> {
  const query = recipientId ? `?recipientProfileId=${encodeURIComponent(recipientId)}` : '';
  return gatewayGet<ParcelResponse[]>(userId, `/parcels${query}`);
}

export function getExposure(userId: string, recipientId: string): Promise<ExposureResult> {
  return gatewayGet<ExposureResult>(userId, `/exposure/recipient/${recipientId}`);
}

export function getParcel(userId: string, parcelId: string): Promise<ParcelDetailResponse> {
  return gatewayGet<ParcelDetailResponse>(userId, `/parcels/${parcelId}`);
}

async function gatewayPost<T>(userId: string, path: string, body: unknown): Promise<T> {
  const token = await mintGatewayToken(userId);

  const response = await fetch(`${BASE_URL}/api${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gateway POST ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface CreateParcelBody {
  recipientProfileId: string;
  trackingNumber: string;
  carrier?: string;
  description?: string;
  declaredValueUsd?: number;
  weightKg?: number;
  quantity?: number;
}

export function createParcel(userId: string, body: CreateParcelBody): Promise<ParcelResponse> {
  return gatewayPost<ParcelResponse>(userId, '/parcels', body);
}

export function createRecipient(
  userId: string,
  body: { name: string; isDefault?: boolean },
): Promise<RecipientResponse> {
  return gatewayPost<RecipientResponse>(userId, '/recipients', body);
}

async function gatewayPatch<T>(userId: string, path: string, body: unknown): Promise<T> {
  const token = await mintGatewayToken(userId);

  const response = await fetch(`${BASE_URL}/api${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gateway PATCH ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function updateRecipient(
  userId: string,
  recipientId: string,
  body: { name?: string; isDefault?: boolean },
): Promise<RecipientResponse> {
  return gatewayPatch<RecipientResponse>(userId, `/recipients/${recipientId}`, body);
}

export function aiReviews(userId: string, url: string): Promise<ReviewResponse> {
  return gatewayPost<ReviewResponse>(userId, '/ai/reviews', { url });
}

export function aiProductSearch(
  userId: string,
  description: string,
): Promise<ProductSearchResponse> {
  return gatewayPost<ProductSearchResponse>(userId, '/ai/product-search', { description });
}

export async function deleteRecipient(userId: string, recipientId: string): Promise<void> {
  const token = await mintGatewayToken(userId);

  const response = await fetch(`${BASE_URL}/api/recipients/${recipientId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gateway DELETE /recipients/${recipientId} failed: ${response.status}`);
  }
}
