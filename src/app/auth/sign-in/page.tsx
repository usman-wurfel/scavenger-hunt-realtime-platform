"use client";

import { useFormik } from "formik";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import * as yup from "yup";

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  InputAdornment,
  Paper,
  Typography,
} from "@mui/material";

import Logo from "@/components/logo/logo";
import { formNoAutofill, inputNoAutofill, passwordNoAutofill } from "@/lib/form-autofill";
import { toast } from "@/lib/toast";
import NiEyeClose from "@/icons/nexture/ni-eye-close";
import NiEyeOpen from "@/icons/nexture/ni-eye-open";

const validationSchema = yup.object({
  email: yup.string().required("Email is required").email("Enter a valid email"),
  password: yup.string().required("Password is required"),
});

export default function SignInPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          toast.error(data.error || "Login failed");
          return;
        }
        const destination =
          nextPath && nextPath.startsWith("/") && !nextPath.startsWith("/auth/")
            ? nextPath
            : "/dashboard";
        // Full reload so dashboard Header/LeftMenu mount cleanly after auth layout.
        // Soft router.push leaves chrome missing until hard refresh.
        window.location.assign(destination);
      } catch {
        toast.error("Connection error. Please try again.");
        setLoading(false);
      }
    },
    validateOnBlur: false,
  });

  return (
    <Box className="flex min-h-screen w-full items-center justify-center p-4">
      <Paper elevation={3} className="bg-background-paper shadow-darker-xs w-lg max-w-full rounded-4xl py-14">
        <Box className="flex flex-col gap-4 px-8 sm:px-14">
          <Box className="mb-14 flex justify-center">
            <Logo classNameMobile="hidden" />
          </Box>

          <Typography variant="h1" component="h1" className="mb-2">
            Sign in
          </Typography>
          <Typography variant="body1" className="text-text-primary mb-6">
            Access your admin account to manage Scavenger Hunt.
          </Typography>

          <Box component="form" onSubmit={formik.handleSubmit} className="flex flex-col gap-4" {...formNoAutofill}>
            <FormControl className="outlined" variant="standard" size="small">
              <FormLabel component="label">Email</FormLabel>
              <Input
                id="email"
                name="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                placeholder="Enter email"
                inputProps={inputNoAutofill}
              />
              {formik.touched.email && formik.errors.email && (
                <Typography variant="caption" color="error">{formik.errors.email}</Typography>
              )}
            </FormControl>

            <FormControl className="outlined" variant="standard" size="small">
              <FormLabel component="label">Password</FormLabel>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formik.values.password}
                onChange={formik.handleChange}
                placeholder="Enter password"
                inputProps={passwordNoAutofill}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <NiEyeClose size="medium" /> : <NiEyeOpen size="medium" />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              {formik.touched.password && formik.errors.password && (
                <Typography variant="caption" color="error">{formik.errors.password}</Typography>
              )}
            </FormControl>

            <Link href="/auth/password-reset" className="link-text-secondary link-underline-hover text-sm font-semibold self-end">
              Forgot password?
            </Link>

            <Button type="submit" variant="contained" disabled={loading} className="mt-2">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
