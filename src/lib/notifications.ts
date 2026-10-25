/** PostgREST `or` filter: not snoozed, or the snooze has expired (UX2-10). */
export const awakeFilter = (now = new Date()) => `snoozed_until.is.null,snoozed_until.lte.${now.toISOString()}`
