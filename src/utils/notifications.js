export function shouldCountNotificationBadge(item) {
  if (!item || typeof item !== 'object') {
    return false;
  }

  return (
    (item.type === 'invite' && item.status === 'pending') ||
    item.is_read === 0 ||
    item.is_read === false
  );
}

export function getNotificationBadgeCount(list) {
  if (!Array.isArray(list)) {
    return 0;
  }

  return list.filter((item) => shouldCountNotificationBadge(item)).length;
}
