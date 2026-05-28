import type { Metadata } from 'next';
import OpenInviteClient from './OpenInviteClient';

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Sıradaki Davet',
  description: 'Sıradaki berber davetini uygulamada aç.',
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  return <OpenInviteClient token={token} />;
}
