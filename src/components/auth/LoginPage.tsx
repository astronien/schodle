import { useState } from 'react';
import { Clock, LogIn, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (employeeCode: string, password: string) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
}

export function LoginPage({ onLogin, error, isLoading }: LoginPageProps) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!employeeCode.trim() || !password.trim()) {
      setLocalError('กรุณากรอกรหัสพนักงานและรหัสผ่าน');
      return;
    }

    await onLogin(employeeCode.trim(), password.trim());
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center font-sans px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
            <Clock className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-text-primary">
            ShiftFlow
          </h1>
        </div>

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
          </form>
        </div>

        <p className="text-center text-xs text-text-quaternary mt-6">
          ระบบจัดการตารางงาน ShiftFlow
        </p>
      </div>
    </div>
  );
}
