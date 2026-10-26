/**
 * Notification & Haptic Service
 * Supports Web Notification API with fallback to synthetic in-app audio chime
 * and toast notification simulation for Matrix Push Gateway.
 */

// Web Audio API subtle synth chime (prevents 404s on external audio files)
export const playMessageSound = (type: 'incoming' | 'sent' | 'alert' = 'incoming') => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'sent') {
      // Crisp subtle upward tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === 'incoming') {
      // Pleasant dual chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.07); // A5

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc1.stop(ctx.currentTime + 0.1);
      osc2.start(ctx.currentTime + 0.07);
      osc2.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // AudioContext blocked by browser policy prior to user interaction
  }
};

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (style === 'light') navigator.vibrate(12);
      else if (style === 'medium') navigator.vibrate(25);
      else navigator.vibrate([30, 40, 30]);
    } catch {
      // Ignore vibration errors on unsupported platforms
    }
  }
};

export interface PushNotificationPayload {
  title: string;
  body: string;
  service: string;
  roomId: string;
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const showPushNotification = (payload: PushNotificationPayload) => {
  playMessageSound('incoming');
  triggerHaptic('medium');

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`[${payload.service.toUpperCase()}] ${payload.title}`, {
        body: payload.body,
        icon: '/favicon.ico',
        tag: payload.roomId,
      });
    } catch {
      // Silent catch if background service worker notification fails
    }
  }
};
