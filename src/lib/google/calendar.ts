import 'server-only'
import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { getValidGoogleAccessToken } from './tokens'

async function clientCalendar(userId: string) {
  const accessToken = await getValidGoogleAccessToken(userId)
  // google.auth.OAuth2 (re-export do googleapis) evita conflito nominal de tipos
  // com o google-auth-library de nível superior (10.9.0 vs 10.5.0 aninhado).
  // Só carrega o access token — client id/secret não são necessários aqui.
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.calendar({ version: 'v3', auth })
}

export async function createMeetEvent(params: {
  userId: string
  titulo: string
  descricao?: string
  inicio: Date
  fim: Date
  convidados?: string[]
}): Promise<{ eventId: string; meetLink: string | null }> {
  const calendar = await clientCalendar(params.userId)
  const res = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1, // obrigatório — sem isso o conferenceData é ignorado
    sendUpdates: 'all',
    requestBody: {
      summary: params.titulo,
      description: params.descricao,
      start: { dateTime: params.inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: params.fim.toISOString(), timeZone: 'America/Sao_Paulo' },
      attendees: params.convidados?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })
  return { eventId: res.data.id!, meetLink: res.data.hangoutLink ?? null }
}

/** Patch preserva o conferenceData — o link do Meet continua o mesmo depois de remarcar. */
export async function updateEventTimes(
  userId: string,
  eventId: string,
  inicio: Date,
  fim: Date,
): Promise<void> {
  const calendar = await clientCalendar(userId)
  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
    requestBody: {
      start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
    },
  })
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const calendar = await clientCalendar(userId)
  await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' })
}
