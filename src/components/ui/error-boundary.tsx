"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageFrame } from "@/components/layout/page-frame";
import { SurfacePanel } from "@/components/layout/surface-panel";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";

const logger = createLogger("error-boundary");

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("React rendering error", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppShell>
          <PageFrame
            title="Something went wrong"
            description="An unexpected error occurred. Try reloading the page or go back to setup."
            headerClassName="mx-auto text-center"
          >
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
              <SurfacePanel
                title="Error details"
                description="The application encountered an error it could not recover from."
              >
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        window.location.reload();
                      }}
                    >
                      Reload page
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        window.location.href = "/";
                      }}
                    >
                      Go to setup
                    </Button>
                  </div>
                </div>
              </SurfacePanel>
            </div>
          </PageFrame>
        </AppShell>
      );
    }

    return this.props.children;
  }
}
