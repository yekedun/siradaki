import type { Metadata } from 'next';
import OpenInviteClient from './OpenInviteClient';

interface Props {
  params: { token: string };
}

export const metadata: Metadata = {
  title: 'Sıradaki Davet',
  description: 'Sıradaki berber davetini uygulamada aç.',
};

export default function InvitePage({ params }: Props) {
  return <OpenInviteClient token={params.token} />;
}
