import { ParcelContent } from '@/app/(cabinet)/delivery/[id]/parcel-content';

export const metadata = {
  title: "Jo'natma",
  description: 'Posilkangiz qayerda ekanini kuzating.',
};

export default async function ParcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ParcelContent id={id} />;
}
