/* Server & socket `DateTime` values carry IST wall-clock serialized with 'Z'
   (e.g. "2026-09-29T14:32:39.113Z" = 2:32 PM IST). Optimistic outgoing
   messages must stamp the same frame — a real UTC ISO string would sort
   ~5.5h behind incoming socket messages until the next API reload. */
export const nowAsServerIST = () =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString();

export function formatChatTimestamp(input) {
  const date = new Date(input);
  const now = new Date();

  const indianDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  const indianNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const indianYesterday = new Date(indianNow.getTime());
  indianYesterday.setDate(indianNow.getDate() - 1);

  if (isSameDay(indianDate, indianNow)) {
    return indianDate.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'GMT',
    });
  } else if (isSameDay(indianDate, indianYesterday)) {
    return 'Yesterday';
  } else if (indianNow - indianDate < 7 * 24 * 60 * 60 * 1000) {
    return indianDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      timeZone: 'GMT',
    });
  } else if (indianDate.getFullYear() === indianNow.getFullYear()) {
    return indianDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'GMT',
    });
  } else {
    return indianDate.toLocaleDateString('en-GB', {
      timeZone: 'GMT',
    });
  }
}

export const extractTimeFromISO = (isoString) => {
  if (!isoString) return '';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'GMT',
    });
  } catch (error) {
    console.warn('Error extracting time from ISO string:', isoString, error);
    return '';
  }
};

export const FormatDateIST = (date, formatOptions) => {
  if (!date) return { date: 'N/A', time: 'N/A' };

  try {
    const entryDate = new Date(date);
    if (isNaN(entryDate.getTime())) {
      return { date: 'Invalid Date', time: 'Invalid Time' };
    }

    const dd = String(entryDate.getUTCDate()).padStart(2, '0');
    const mm = String(entryDate.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = entryDate.getUTCFullYear();

    let formattedDate;
    if (!formatOptions) {
      formattedDate = entryDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } else if (formatOptions === 'dd-mm-yyyy') {
      formattedDate = `${dd}-${mm}-${yyyy}`;
    } else if (formatOptions === 'dd/mm/yyyy') {
      formattedDate = `${dd}/${mm}/${yyyy}`;
    } else if (formatOptions === 'yyyy-mm-dd') {
      formattedDate = `${yyyy}-${mm}-${dd}`;
    } else {
      formattedDate = `${dd}-${mm}-${yyyy}`;
    }

    const formattedTime = entryDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });

    return { date: formattedDate, time: formattedTime };
  } catch (error) {
    console.error('Error formatting date:', error);
    return { date: 'N/A', time: 'N/A' };
  }
};

export const formatDateHeader = (dateString) => {
  if (!dateString) return 'Today';

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (dateString === today) {
    return 'Today';
  } else if (dateString === yesterday) {
    return 'Yesterday';
  } else {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Today';
      return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return 'Today';
    }
  }
};
