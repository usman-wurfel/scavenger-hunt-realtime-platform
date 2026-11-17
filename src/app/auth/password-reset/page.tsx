"use client";

import Link from "next/link";
import React, { useState } from "react";

import { Box, Button, FormControl, FormLabel, Input, Paper, Typography } from "@mui/material";

import Logo from "@/components/logo/logo";
import { formNoAutofill, inputNoAutofill } from "@/lib/form-autofill";
import { toast } from "@/lib/toast";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetUrl("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Request failed");
        return;
      }
      toast.success(data.message || "Reset link sent");
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="flex min-h-screen w-full items-center justify-center p-4">
      <Paper elevation={3} className="bg-background-paper shadow-darker-xs w-lg max-w-full rounded-4xl py-14">
        <Box className="flex flex-col gap-4 px-8 sm:px-14">
          <Box className="mb-14 flex justify-center">
            <Logo classNameMobile="hidden" />
          </Box>

          <Typography variant="h1" component="h1" className="mb-2">
            Reset Password
          </Typography>
          <Typography variant="body1" className="text-text-primary mb-6">
            Enter your email and we&apos;ll send you a reset link.
          </Typography>

          {resetUrl && (
            <Box className="bg-grey-25 mb-2 rounded-xl p-4">
              <Typography variant="caption" display="block" className="text-text-secondary mb-1">
                Dev reset link:
              </Typography>
              <Link href={resetUrl} className="link-primary text-xs break-all">
                {resetUrl}
              </Link>
            </Box>
          )}

          <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-4" {...formNoAutofill}>
            <FormControl className="outlined" variant="standard" size="small">
              <FormLabel component="label">Email</FormLabel>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} required inputProps={inputNoAutofill} />
            </FormControl>

            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
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
