import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] sm:bottom-6 sm:left-auto sm:right-6 sm:w-80">
      <div className="bg-bg-panel/95 backdrop-blur-xl border border-brand/30 shadow-overlay rounded-xl p-4 flex flex-col gap-3 animate-slide-up">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-brand animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">มีเวอร์ชันใหม่!</h3>
              <p className="text-xs text-text-tertiary">อัปเดตเพื่อใช้งานฟีเจอร์ล่าสุด</p>
            </div>
          </div>
          <button 
            onClick={() => setNeedRefresh(false)}
            className="p-1 text-text-quaternary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={() => updateServiceWorker(true)}
          className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-medium py-2 rounded-lg transition-all duration-200 shadow-lg shadow-brand/20 active:scale-[0.98]"
        >
          อัปเดตเดี๋ยวนี้
        </button>
      </div>
    </div>
  );
}
