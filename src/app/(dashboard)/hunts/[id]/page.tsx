import HuntDetailView from "@/components/HuntDetailView";

type HuntDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function HuntDetailPage({ params }: HuntDetailPageProps) {
  const { id } = await params;
  return <HuntDetailView huntId={id} />;
}
