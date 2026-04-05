"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/feed");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in-up">
      <h1 className="text-title text-center mb-2">notebook</h1>
      <p className="text-caption text-[var(--color-muted)] text-center mb-10">
        your training journal
      </p>

      <div className="space-y-3 mb-6">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-4 py-3.5 rounded-[var(--radius)] bg-[var(--color-surface)] text-[15px] outline-none placeholder:text-[var(--color-muted)] focus:ring-2 focus:ring-[var(--color-text)]/10"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full px-4 py-3.5 rounded-[var(--radius)] bg-[var(--color-surface)] text-[15px] outline-none placeholder:text-[var(--color-muted)] focus:ring-2 focus:ring-[var(--color-text)]/10"
        />
      </div>

      {error && (
        <p className="text-caption text-[var(--color-danger)] text-center mb-4 animate-fade-in">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-[var(--radius)] bg-[var(--color-text)] text-white text-[15px] font-semibold min-h-[50px] active:scale-[0.98] disabled:opacity-40"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-caption text-[var(--color-secondary)] text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-text)] font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
