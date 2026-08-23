import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export const MessageContext = createContext(null);

export function MessageProvider({ children }) {
  const [unreadCounts, setUnreadCounts] = useState({});

  const addUnread = useCallback((groupId) => {
    const key = Number(groupId);
    if (!Number.isInteger(key)) {
      return;
    }
    setUnreadCounts((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));
  }, []);

  const clearUnread = useCallback((groupId) => {
    const key = Number(groupId);
    if (!Number.isInteger(key)) {
      return;
    }
    setUnreadCounts((prev) => ({
      ...prev,
      [key]: 0
    }));
  }, []);

  const value = useMemo(
    () => ({
      unreadCounts,
      addUnread,
      clearUnread
    }),
    [unreadCounts, addUnread, clearUnread]
  );

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
};
