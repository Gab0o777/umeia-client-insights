import { supabase } from '@/lib/supabase';

export type NotifyEvent = 'created' | 'status_changed' | 'assigned' | 'note_added' | 'closed';

export interface NotifyTicketArgs {
  event:  NotifyEvent;
  ticket: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

/**
 * Dispara el email correspondiente vía la edge function `notify-ticket`.
 * Fire-and-forget: si falla, no rompe la UI — solo lo logueamos.
 */
export async function notifyTicket({ event, ticket, extra }: NotifyTicketArgs) {
  try {
    const { error } = await supabase.functions.invoke('notify-ticket', {
      body: { event, ticket, extra },
    });
    if (error) console.warn('[notifyTicket] error invocando la función:', error);
  } catch (err) {
    console.warn('[notifyTicket] error de red:', err);
  }
}
