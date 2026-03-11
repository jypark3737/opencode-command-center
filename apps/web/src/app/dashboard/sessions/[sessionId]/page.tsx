import { SessionDetailView } from "@/components/sessions/SessionDetailView";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <SessionDetailView sessionId={sessionId} />;
}
