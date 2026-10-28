import { useEffect, useRef } from 'react';

interface MobileSessionProps {
  roomCode: string;
  clientType: 'god' | 'player' | null;
  onAutoRejoin: () => void;
}

export const useMobileSession = ({ roomCode, clientType, onAutoRejoin }: MobileSessionProps) => {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let released = false;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock && !released) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        // نادیده گرفتن در صورت عدم پشتیبانی یا رد دسترسی در مرورگر
      }
    };

    if (clientType) {
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (clientType) {
          requestWakeLock();
        }
        if (roomCode && clientType) {
          onAutoRejoin();
        }
      }
    };

    const handlePageShow = () => {
      if (roomCode && clientType) {
        onAutoRejoin();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
      }
    };
  }, [roomCode, clientType, onAutoRejoin]);
};
