import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkAuthRateLimit } from '@/lib/server/check-auth-ratelimit';
import { LoginForm } from './form';

export const metadata: Metadata = {
  title: 'Sign In',
};

const errorMessages: Record<string, string> = {
  '2': 'Check your email to continue the sign-in process.',
  '4': 'Invalid credentials provided.',
  '10': 'Password reset email sent. Check your email to continue.',
  '11': 'The email address is not in a valid format.',
  '12': 'Password recovery requires an email.',
  auth: 'Authentication failed. Please try again or contact support if the issue persists.',
  default: 'An unexpected error occurred.',
  captcha_required: 'Please complete the captcha verification.',
  ratelimit_default: 'Too many attempts. Please try again later.',
  '13': 'Too many login attempts. Please try again later.',
  password_reset_limit:
    'Too many password reset attempts. Please try again later.',
  signin_success: 'Email confirmed successfully. You can now login.',
  code_expired: 'Email link is invalid or has expired.',
};

const messageTypes: Record<string, 'error' | 'success' | 'warning'> = {
  '2': 'success',
  '4': 'error',
  '10': 'success',
  '11': 'error',
  '12': 'error',
  '13': 'warning',
  auth: 'error',
  default: 'error',
  captcha_required: 'error',
  ratelimit_default: 'warning',
  password_reset_limit: 'warning',
  signin_success: 'success',
  code_expired: 'error',
};

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  let errorMessage = params.message
    ? errorMessages[params.message] || errorMessages.default
    : null;
  const messageType = params.message
    ? messageTypes[params.message] || 'error'
    : 'error';

  if (
    params.message?.startsWith('For security purposes, you can only request')
  ) {
    errorMessage = errorMessages.ratelimit_default;
  }

  const checkAuth = async () => {
    'use server';

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return redirect(`/c`);
    }
  };

  await checkAuth();

  const signIn = async (formData: FormData) => {
    'use server';

    const supabase = await createClient();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const captchaToken = formData.get('cf-turnstile-response') as string;
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (!captchaToken) {
      return redirect(`/login?message=captcha_required`);
    }

    if (process.env.RATELIMITER_ENABLED?.toLowerCase() !== 'false') {
      const { success } = await checkAuthRateLimit(email, ip, 'login');
      if (!success) return redirect('/login?message=13');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return redirect(`/login?message=11`);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken,
      },
    });

    if (error) {
      return redirect(`/login?message=4`);
    }

    const { data: aalData, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      return redirect(`/login?message=auth`);
    }

    if (
      aalData.nextLevel === 'aal2' &&
      aalData.nextLevel !== aalData.currentLevel
    ) {
      return redirect(`/login/verify`);
    }

    return redirect(`/c`);
  };

  const handleResetPassword = async (formData: FormData) => {
    'use server';

    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get('origin');
    const email = formData.get('email') as string;
    const captchaToken = formData.get('cf-turnstile-response') as string;
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (!email || email.trim() === '') return redirect('/login?message=12');
    if (!validateEmail(email)) return redirect('/login?message=11');

    if (!captchaToken) {
      return redirect(`/login?message=captcha_required`);
    }

    if (process.env.RATELIMITER_ENABLED?.toLowerCase() !== 'false') {
      const { success } = await checkAuthRateLimit(email, ip, 'password-reset');
      if (!success) return redirect('/login?message=password_reset_limit');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/login/password`,
      captchaToken,
    });

    if (error) return redirect(`/login?message=${error.message}`);

    return redirect('/login?message=10');
  };

  const handleSignInWithGoogle = async () => {
    'use server';

    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get('origin');

    const { error, data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=/login`,
      },
    });

    if (error) {
      return redirect(`/login?message=auth`);
    }

    return redirect(data.url);
  };

  const handleSignInWithMicrosoft = async () => {
    'use server';

    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get('origin');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${origin}/auth/callback?next=/login`,
        scopes: 'email',
      },
    });

    if (error) {
      return redirect(`/login?message=auth`);
    }

    return redirect(data.url);
  };

  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <LoginForm
        onSignIn={signIn}
        onResetPassword={handleResetPassword}
        onGoogleSignIn={handleSignInWithGoogle}
        onMicrosoftSignIn={handleSignInWithMicrosoft}
        errorMessage={errorMessage}
        messageType={messageType}
      />
    </div>
  );
}
