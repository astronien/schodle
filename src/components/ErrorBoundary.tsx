import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center px-4 font-sans">
          <div className="card p-6 sm:p-8 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-danger" />
            </div>
            <div>
              <h1 className="text-base font-bold text-text-primary">
                {this.props.fallbackTitle ?? 'เกิดข้อผิดพลาด'}
              </h1>
              <p className="text-sm text-text-tertiary mt-1">
                แอปพบปัญหาในการแสดงผลหน้านี้ คุณสามารถลองรีเฟรชหรือกลับไปหน้าหลัก
              </p>
            </div>
            {this.state.error && (
              <pre className="text-left text-[11px] text-text-quaternary bg-bg-panel border border-border-solid rounded-lg p-3 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="btn btn-ghost text-xs flex-1"
              >
                <RotateCcw className="w-4 h-4" />
                ลองอีกครั้ง
              </button>
              <button
                onClick={this.handleReload}
                className="btn btn-primary text-xs flex-1"
              >
                รีโหลดแอป
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
