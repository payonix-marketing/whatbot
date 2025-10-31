"use client";

import { useState, useEffect } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.error("This browser does not support desktop notification");
      return;
    }
    const status = await Notification.requestPermission();
    setPermission(status);
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) {
      console.error("This browser does not support desktop notification");
      return;
    }

    if (permission === 'granted') {
      // Only show notification if the page is not visible
      if (document.visibilityState === 'hidden') {
        const notification = new Notification(title, options);
      }
    }
  };

  return { requestPermission, showNotification, permission };
}