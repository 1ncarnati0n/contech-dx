import { notFound } from 'next/navigation';
import PromoteToAdminClient from './PromoteToAdminClient';

export default function PromoteToAdminPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <PromoteToAdminClient />;
}
