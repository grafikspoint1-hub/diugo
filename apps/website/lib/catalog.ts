export type Category = { id: string; name: string; slug: string; icon?: string | null };
export type Product = {
  id: string;
  name: string;
  description?: string | null;
  pricePaise: number;
  imageUrl?: string | null;
  stock?: number;
  reservedStock?: number;
  category?: Category | null;
  business?: { id?: string; name: string; slug?: string; supportsPickup?: boolean };
};
export type Business = { id: string; name: string; slug: string; description?: string | null; address?: string | null; locality?: string | null; category?: Category | null };
export type EventListing = { id: string; title: string; description?: string | null; venue?: string | null; startsAt: string; endsAt?: string | null; capacity?: number | null; tickets: Array<{ id: string; ticketType: string; pricePaise: number; quantity: number; sold: number }> };
export type ClassifiedListing = { id: string; title: string; pricePaise: number; locality: string; condition: string; photoUrls: string[]; category: Category };

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiBase}${path}`, { next: { revalidate: 30 } });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function getCategories() {
  return getJson<Category[]>('/categories');
}

export async function getProducts(query?: string, categoryId?: string) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (categoryId) params.set('categoryId', categoryId);
  const search = params.size ? `?${params.toString()}` : '';
  return getJson<Product[]>(`/products${search}`);
}

export async function getBusinesses(query?: string, categoryId?: string) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (categoryId) params.set('categoryId', categoryId);
  const search = params.size ? `?${params.toString()}` : '';
  return getJson<Business[]>(`/businesses${search}`);
}

export async function getBusiness(slug: string) {
  return getJson<Business & { products?: Product[] }>(`/businesses/${encodeURIComponent(slug)}`);
}

export async function getEvents() {
  return getJson<EventListing[]>('/events');
}

export async function getClassifiedListings() {
  return getJson<ClassifiedListing[]>('/classifieds');
}
