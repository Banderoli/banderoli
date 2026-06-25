import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthForm } from '@/components/AuthForm';

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }

  return <AuthForm mode="register" />;
}
