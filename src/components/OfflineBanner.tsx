import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-danger/90 text-white text-xs font-semibold rounded-full shadow-lg backdrop-blur-sm">
      <WifiOff className="w-3.5 h-3.5" />
      คุณกำลังทำงานแบบออฟไลน์ ข้อมูลอาจไม่เป็นปัจจุบัน
    </div>
  );
}
