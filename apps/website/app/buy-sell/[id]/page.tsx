import { ClassifiedListingDetail } from './listing-detail';

export default async function BuySellListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassifiedListingDetail listingId={id} />;
}
