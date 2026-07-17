import { useState } from 'react';
import { Clock, LogIn, AlertCircle, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoginPageProps {
  onLogin: (employeeCode: string, password: string) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
  appName: string;
}

async function callSelfResetPassword(employeeCode: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    'self-reset-password',
    { body: { employee_code: employeeCode } },
  );
  if (error) {
    // On non-2xx responses `data` is null; the server's message is in the
    // Response object attached to FunctionsHttpError as `context`.
    let serverMsg: string | null = null;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = (await ctx.json()) as { error?: string };
        serverMsg = parsed?.error ?? null;
      } catch { /* ignore */ }
    }
    throw new Error(serverMsg ?? (data as { error?: string } | null)?.error ?? error.message);
  }
  if (data?.error) {
    throw new Error(data.error);
  }
}

export function LoginPage({ onLogin, error, isLoading, appName }: LoginPageProps) {

  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!employeeCode.trim() || !password.trim()) {
      setLocalError('กรุณากรอกรหัสพนักงานและรหัสผ่าน');
      return;
    }

    await onLogin(employeeCode.trim(), password.trim());
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!employeeCode.trim()) {
      setResetError('กรุณากรอกรหัสพนักงาน');
      return;
    }

    setIsResetting(true);
    try {
      await callSelfResetPassword(employeeCode.trim());
      setResetSuccess(true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
    } finally {
      setIsResetting(false);
    }
  };

  const closeReset = () => {
    setShowReset(false);
    setResetError(null);
    setResetSuccess(false);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center font-sans px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-6 sm:mb-8">
          <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-md">
            <Clock className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {appName}
          </h1>

        </div>

        {showReset ? (
        <div className="card p-6 animate-fade-in">
          <h2 className="text-lg font-medium text-text-primary mb-1">รีเซ็ตรหัสผ่าน</h2>
          <p className="text-sm text-text-tertiary mb-5">
            กรอกรหัสพนักงานของคุณ รหัสผ่านจะถูกรีเซ็ตเป็นรหัสพนักงาน
          </p>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-start gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <p className="text-sm text-success">
                  รีเซ็ตรหัสผ่านสำเร็จ — เข้าสู่ระบบด้วยรหัสพนักงานของคุณเป็นรหัสผ่าน แล้วระบบจะให้ตั้งรหัสผ่านใหม่
                </p>
              </div>
              <button onClick={closeReset} className="btn btn-primary w-full">
                <LogIn className="w-4 h-4" />
                กลับไปเข้าสู่ระบบ
              </button>
            </div>
          ) : (
            <>
              {resetError && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{resetError}</p>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    รหัสพนักงาน
                  </label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="เช่น 3653"
                    className="input-field"
                    autoComplete="username"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetting}
                  className="btn btn-primary w-full mt-2"
                >
                  {isResetting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      รีเซ็ตรหัสผ่าน
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeReset}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  กลับไปเข้าสู่ระบบ
                </button>
              </form>
            </>
          )}
        </div>
        ) : (
        <div className="card p-6 animate-fade-in">
          <h2 className="text-lg font-medium text-text-primary mb-1">เข้าสู่ระบบ</h2>
          <p className="text-sm text-text-tertiary mb-5">
            กรอกรหัสพนักงานและรหัสผ่านเพื่อเข้าใช้งาน
          </p>

          {displayError && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                รหัสพนักงาน
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="เช่น 3653"
                className="input-field"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full mt-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  เข้าสู่ระบบ
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="w-full text-center text-sm text-text-tertiary hover:text-text-primary transition-colors py-1"
            >
              ลืมรหัสผ่าน?
            </button>
          </form>
        </div>
        )}

        <p className="text-center text-xs text-text-quaternary mt-6">
          ระบบจัดการตารางงาน {appName}

        </p>
      </div>
    </div>
  );
}
