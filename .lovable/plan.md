

## Plan: Fix Vacation Detail Actions and Calendar Display

### Problem 1: Action buttons don't update after clicking
When you perform an action (approve, start, complete, cancel) in the vacation detail dialog, the modal stays open but the buttons don't refresh to reflect the new status.

**Solution**: After each successful action, close the dialog automatically. This ensures the user sees the updated list, and reopening the detail will show the correct buttons.

**Files to modify**: `src/components/vacations/VacationDetailDialog.tsx`
- Add `onOpenChange(false)` after each successful mutation call (`handleApprove`, `handleCancel`, `handleStartVacation`, `handleCompleteVacation`)

### Problem 2: Completed vacations not visible in the shift calendar
The shift/schedule calendar only queries vacations with status "aprobado" or "en_curso", so once a vacation is marked as "completado", it disappears from the calendar.

**Solution**: Add `'completado'` to the status filter in the absences query.

**Files to modify**: `src/components/schedules/ShiftCalendar.tsx`
- Change line 145 from `.in('status', ['aprobado', 'en_curso'])` to `.in('status', ['aprobado', 'en_curso', 'completado'])`

### Technical Summary

| File | Change |
|---|---|
| `VacationDetailDialog.tsx` | Close dialog (`onOpenChange(false)`) after each action handler succeeds |
| `ShiftCalendar.tsx` | Add `'completado'` to the vacation status filter in the absences query |

Both changes are minimal and isolated, with no risk of side effects.

