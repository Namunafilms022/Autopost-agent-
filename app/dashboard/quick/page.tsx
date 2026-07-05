import { redirect } from 'next/navigation';

export default function QuickRedirect() {
  redirect('/dashboard/new-post');
}
