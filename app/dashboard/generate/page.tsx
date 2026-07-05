import { redirect } from 'next/navigation';

export default function GenerateRedirect() {
  redirect('/dashboard/new-post');
}
