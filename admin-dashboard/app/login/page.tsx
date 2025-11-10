'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  async function sendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
      });

      if (error) throw error;

      setOtpSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'email',
      });

      if (error) throw error;

      // Check if user is admin
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      console.log('User ID:', data.user?.id);
      console.log('User data from DB:', user);
      console.log('User error:', userError);
      console.log('User error code:', userError?.code);
      console.log('User error message:', userError?.message);

      if (userError) {
        // Check if it's a "not found" error vs RLS error
        if (userError.code === 'PGRST116') {
          // User doesn't exist - this is expected for first login
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user?.id,
              email: data.user?.email,
              name: data.user?.email?.split('@')[0],
              is_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('Insert error:', insertError);
          }
          
          await supabase.auth.signOut();
          throw new Error('Account created but admin privileges not granted. Please contact administrator.');
        } else {
          // Some other error (likely RLS)
          await supabase.auth.signOut();
          throw new Error(`Database error: ${userError.message}. Error code: ${userError.code}`);
        }
      }

      if (!user?.is_admin) {
        await supabase.auth.signOut();
        throw new Error(`Access denied. Admin privileges required. User ID: ${data.user?.id}`);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            College Study Admin Portal
          </h1>
          <p className="text-gray-600">
            {otpSent ? 'Enter the OTP sent to your email' : 'Login to manage content'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={sendOTP}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="admin@hbtu.ac.in"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOTP}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setError('');
              }}
              disabled={loading}
              className="w-full text-primary-500 py-2 rounded-lg font-medium hover:bg-primary-50 transition"
            >
              Change Email
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Admin access only</p>
        </div>
      </div>
    </div>
  );
}
