"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable React Error Boundary for Storefront Component Trees
 * Isolates runtime rendering exceptions to prevent crashing the entire application.
 */
export class StorefrontErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("StorefrontErrorBoundary caught exception:", error, errorInfo);
    }
  }

  public handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full py-8 px-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle size={20} />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-sm font-bold font-display uppercase tracking-wide text-foreground">
              {this.props.fallbackTitle || "Unable to display this section"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {this.props.fallbackMessage ||
                "A temporary error occurred while rendering this content. Please try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <RotateCcw size={13} />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default StorefrontErrorBoundary;
