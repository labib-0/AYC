"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Eye, EyeOff, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { authService } from "@/services/auth.service";
import BrandName from "@/components/common/BrandName";

export type AuthView = "signin" | "signup" | "forgot-password";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthView;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialView = "signin",
}: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<AuthView>(initialView);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "info" | "error" | "success";
    text: string;
  } | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState(""); // email or phone
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open or view change
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrors({});
      setStatusMessage(null);
      setIsLoading(false);
      setShowPassword(false);
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialView]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!identifier.trim()) {
      newErrors.identifier = "Email address is required";
    } else {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
      if (!isEmail) {
        newErrors.identifier = "Please enter a valid email address";
      }
    }

    if (view !== "forgot-password") {
      if (!password) {
        newErrors.password = "Password is required";
      } else if (password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    if (view === "signup" && !fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (view === "signin") {
        const res = await signIn(identifier.trim(), password);
        if (res.error) {
          const errMsg = typeof res.error === "string" ? res.error : res.error.message || "Invalid credentials. Please check and try again.";
          setStatusMessage({
            type: "error",
            text: errMsg,
          });
        } else {
          setStatusMessage({
            type: "success",
            text: "Signed in successfully!",
          });
          setTimeout(() => {
            onClose();
          }, 600);
        }
      } else if (view === "signup") {
        const res = await signUp(identifier.trim(), password, fullName.trim());
        if (res.error) {
          const errMsg = typeof res.error === "string" ? res.error : res.error.message || "Could not complete registration. Please try again.";
          setStatusMessage({
            type: "error",
            text: errMsg,
          });
        } else {
          setStatusMessage({
            type: "success",
            text: "Account created successfully! Welcome to AYAAN CLOTHING.",
          });
          setTimeout(() => {
            onClose();
          }, 800);
        }
      } else if (view === "forgot-password") {
        await authService.forgotPassword(identifier.trim());
        setStatusMessage({
          type: "success",
          text: `A password reset link has been dispatched to ${identifier.trim()}.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setStatusMessage({
      type: "info",
      text: "Google OAuth sign-in is not available in frontend demo mode. Please sign in with email credentials.",
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[200] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <div
          ref={modalRef}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-[440px] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all transform animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-2">
            <div>
              <div className="mb-2">
                <BrandName className="text-xl font-bold tracking-wider text-foreground" />
              </div>
              <h2
                id="auth-modal-title"
                className="text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight"
              >
                {view === "signin" && "Sign In"}
                {view === "signup" && "Create Account"}
                {view === "forgot-password" && "Reset Password"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                {view === "signin" && "Welcome back to your sourcing account"}
                {view === "signup" && "Join for direct apparel sourcing & wholesale pricing"}
                {view === "forgot-password" && "Enter your email or phone to reset password"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 pt-4 flex flex-col gap-4">
            {/* Status Message Alert */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  statusMessage.type === "error"
                    ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50"
                    : statusMessage.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50"
                }`}
              >
                {statusMessage.type === "error" && <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                {statusMessage.type === "success" && <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
                {statusMessage.type === "info" && <ShieldCheck size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />}
                <div className="leading-relaxed">{statusMessage.text}</div>
              </div>
            )}

            {/* Social Logins for Sign In & Sign Up */}
            {view !== "forgot-password" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-800 dark:text-white font-medium text-sm transition-all press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Google SVG Icon */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    or
                  </span>
                  <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                </div>
              </>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Full Name for Sign Up */}
              {view === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      ref={firstInputRef}
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.fullName) setErrors({ ...errors, fullName: "" });
                      }}
                      placeholder="Enter your full name"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50/50 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none transition-colors ${
                        errors.fullName
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          : "border-slate-200 dark:border-white/15 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.fullName}
                    </p>
                  )}
                </div>
              )}

              {/* Email / Phone Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email or phone number
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={view !== "signup" ? firstInputRef : undefined}
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errors.identifier) setErrors({ ...errors, identifier: "" });
                    }}
                    placeholder="Enter email or phone number"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50/50 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none transition-colors ${
                      errors.identifier
                        ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        : "border-slate-200 dark:border-white/15 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    }`}
                  />
                </div>
                {errors.identifier && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.identifier}
                  </p>
                )}
              </div>

              {/* Password Field */}
              {view !== "forgot-password" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    {view === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setView("forgot-password");
                          setErrors({});
                          setStatusMessage(null);
                        }}
                        className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors focus-visible:outline-none underline underline-offset-2"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: "" });
                      }}
                      placeholder="Enter Password"
                      className={`w-full pl-10 pr-11 py-2.5 rounded-xl border bg-slate-50/50 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none transition-colors ${
                        errors.password
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          : "border-slate-200 dark:border-white/15 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white focus-visible:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.password}
                    </p>
                  )}
                </div>
              )}

              {/* Security guarantee & Terms for Sign Up */}
              {view === "signup" && (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                    <span>Protected by AYAAN CLOTHING 256-bit secure customer privacy</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    By clicking Get Started, you agree to AYAAN CLOTHING&apos;s{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setStatusMessage({
                          type: "info",
                          text: "AYAAN CLOTHING Terms: Wholesale B2B orders are governed by standard international export terms and AQL 2.5 quality standards.",
                        });
                      }}
                      className="text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 cursor-pointer"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setStatusMessage({
                          type: "info",
                          text: "AYAAN CLOTHING Privacy Policy: We respect your data and never sell personal information.",
                        });
                      }}
                      className="text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    .
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-3 px-4 rounded-xl text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all press-feedback disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {view === "signin" && "Sign In"}
                    {view === "signup" && "Get Started"}
                    {view === "forgot-password" && "Send Reset Link"}
                  </>
                )}
              </button>
            </form>

            {/* Bottom Switch Links */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/10 text-center text-xs text-slate-600 dark:text-slate-400">
              {view === "signin" && (
                <p>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView("signup");
                      setErrors({});
                      setStatusMessage(null);
                    }}
                    className="font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-2 transition-colors ml-1"
                  >
                    Create Account
                  </button>
                </p>
              )}

              {view === "signup" && (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView("signin");
                      setErrors({});
                      setStatusMessage(null);
                    }}
                    className="font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-2 transition-colors ml-1"
                  >
                    Sign In
                  </button>
                </p>
              )}

              {view === "forgot-password" && (
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    setErrors({});
                    setStatusMessage(null);
                  }}
                  className="font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  ← Back to Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
