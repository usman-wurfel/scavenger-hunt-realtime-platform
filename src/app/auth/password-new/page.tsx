"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, Suspense } from "react";

import { Box, Button, FormControl, FormLabel, Input, Paper, Typography } from "@mui/material";

import Logo from "@/components/logo/logo";
import { formNoAutofill, passwordNoAutofill } from "@/lib/form-autofill";
import { toast } from "@/lib/toast";

function PasswordNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Password reset failed");
        return;
      }
      toast.success("Password updated. Please sign in.");
      router.push("/auth/sign-in");
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box className="flex min-h-screen w-full items-center justify-center p-4">
        <Paper className="p-8 rounded-4xl text-center">
          <Typography color="error" className="mb-4">Invalid reset link</Typography>
          <Link href="/auth/password-reset">Request a new reset link</Link>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className="flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4">
      <Paper elevation={3} className="bg-background-paper shadow-darker-xs w-lg max-w-full rounded-4xl py-14">
        <Box className="flex flex-col gap-4 px-8 sm:px-14">
          <Box className="mb-14 flex justify-center">
            <Logo classNameMobile="hidden" />
          </Box>

          <Typography variant="h1" component="h1" className="mb-2">
            New Password
          </Typography>
          <Typography variant="body1" className="text-text-primary mb-6">
            Set your new password below.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-4" {...formNoAutofill}>
            <FormControl className="outlined" variant="standard" size="small">
              <FormLabel component="label">New Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                inputProps={{ minLength: 6, ...passwordNoAutofill }}
              />
            </FormControl>

            <FormControl className="outlined" variant="standard" size="small">
              <FormLabel component="label">Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                inputProps={{ minLength: 6, ...passwordNoAutofill }}
              />
            </FormControl>

            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>

            <Link href="/auth/sign-in" className="link-primary link-underline-hover text-center text-sm">
              Back to sign in
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default function PasswordNewPage() {
  return (
    <Suspense>
      <PasswordNewForm />
    </Suspense>
  );
}
