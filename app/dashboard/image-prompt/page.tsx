import { redirect } from 'next/navigation';

export default function ImagePromptRedirect() {
  redirect('/dashboard/new-post');
}
