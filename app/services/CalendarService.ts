import * as Calendar from 'expo-calendar/legacy';

class CalendarService {
  async requestPermission(): Promise<boolean> {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  }

  async hasPermission(): Promise<boolean> {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  }

  async getUpcomingEventsContext(): Promise<string | null> {
    const permitted = await this.hasPermission() || await this.requestPermission();
    if (!permitted) return null;

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (!calendars.length) return 'User has no calendars configured.';

      const calendarIds = calendars.map((c) => c.id);
      const events = await Calendar.getEventsAsync(calendarIds, now, sevenDaysLater);

      if (!events.length) return 'User has no upcoming calendar events in the next 7 days.';

      const formatted = events
        .filter((e) => e.title)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 15)
        .map((e) => {
          const start = new Date(e.startDate);
          const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const timeStr = e.allDay
            ? 'All day'
            : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const location = e.location ? ` @ ${e.location}` : '';
          return `- ${e.title}: ${dateStr} at ${timeStr}${location}`;
        })
        .join('\n');

      return `User's upcoming calendar events (next 7 days):\n${formatted}`;
    } catch {
      return null;
    }
  }
}

export const calendarService = new CalendarService();
