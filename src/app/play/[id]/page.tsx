import { Participant } from "./Participant";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Participant presentationId={id} />;
}
