import type { CommunityEvent } from '../../domain/models';

export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'] as const;

export interface GoogleCalendarEventPayload {
  summary: string;
  location: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
  reminders: {
    useDefault: boolean;
    overrides: Array<{ method: 'popup'; minutes: number }>;
  };
}

export function buildGoogleCalendarPayload(
  event: CommunityEvent,
  reminderMinutes: number = 60
): GoogleCalendarEventPayload {
  return {
    summary: event.title,
    location: event.location,
    description: `${event.description}\n\nHosted via CONNECT Community (${event.hostName})`,
    start: { dateTime: event.startIso },
    end: { dateTime: event.endIso },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: reminderMinutes }],
    },
  };
}

export async function insertGoogleCalendarEvent(params: {
  accessToken: string;
  event: CommunityEvent;
  reminderMinutes?: number;
}): Promise<{ htmlLink?: string }> {
  const payload = buildGoogleCalendarPayload(params.event, params.reminderMinutes);
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to create event in Google Calendar.');
  }
  return (await res.json()) as { htmlLink?: string };
}

export function generateIcsContent(event: CommunityEvent): string {
  const formatIcsDate = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CONNECT Community//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@connect-community.app`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(event.startIso)}`,
    `DTEND:${formatIcsDate(event.endIso)}`,
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `LOCATION:${event.location.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
