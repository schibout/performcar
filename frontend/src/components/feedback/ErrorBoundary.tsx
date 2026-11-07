"use client";

import React, { Component, type ReactNode } from "react";

import { type TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  t: TFunction;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

class ErrorBoundaryBase extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({
      componentStack: info.componentStack ?? undefined,
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, componentStack: undefined });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { t } = this.props;

    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-9xl font-extrabold tracking-widest text-primary opacity-20">ERR!</h1>
          <div className="absolute rotate-12 rounded bg-destructive px-2 text-sm text-destructive-foreground">
            {t("common:error_occurred")}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-2xl font-semibold md:text-3xl">{t("common:something_went_wrong")}</p>
          <p className="max-w-md text-muted-foreground whitespace-pre-wrap">
            {this.state.error?.message || t("common:unexpected_error")}
          </p>
          <div className="mt-4 flex gap-4">
            <Button variant="default" onClick={this.handleReset}>
              {t("common:retry")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload();
              }}
            >
              {t("common:refresh_page")}
            </Button>
          </div>
        </div>

        {!!(process.env.NODE_ENV !== "production" && this.state.error) && (
          <div className="mt-12 w-full max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left font-mono text-xs">
            <p className="mb-2 font-bold text-destructive">Error Details (Development Only):</p>
            <pre className="whitespace-pre-wrap overflow-x-auto">
              {this.state.error.stack ?? String(this.state.error)}
              {this.state.componentStack}
            </pre>
          </div>
        )}
      </div>
    );
  }
}

export function ErrorBoundary({ children, onReset }: Omit<ErrorBoundaryProps, "t">) {
  const { t } = useTranslation();
  return (
    <ErrorBoundaryBase t={t} onReset={onReset}>
      {children}
    </ErrorBoundaryBase>
  );
}
