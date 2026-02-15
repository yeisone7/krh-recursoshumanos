
## Show "D" (Descanso) on non-working days for administrative schedules

### Problem
When an employee has an administrative schedule (e.g., Monday-Friday), the calendar shows working days with the schedule badge (e.g., "ADM") but leaves non-working days (Saturday, Sunday) as blank/empty cells. This is confusing because the user cannot distinguish between "no configuration" and "rest day."

### Solution
For employees in administrative mode, on days NOT included in their `days_of_week` configuration (rest days), display a "D" badge (Descanso) with a neutral/gray style, similar to how rest-day shifts are displayed.

### Changes

**File: `src/components/schedules/ShiftCalendar.tsx`**

1. Replace the empty cell rendering for admin rest days (line 743) with a styled "D" badge:
   - Instead of `<div className="h-6" />` when `isAdminMode && !adminIsWorkDay`, render a badge with text "D" using a gray/neutral style (e.g., `bg-gray-100 text-gray-500 border border-gray-300`).
   - Keep the truly empty cell only for non-admin employees with no shift/absence.

2. Update the legend section (around line 522-555) to add an entry for "D" (Descanso) so users understand the badge meaning.

### Technical Detail

Current code (line 742-743):
```tsx
{/* Empty: non-admin with no shift/absence, or admin rest day */}
{!shift && !absence && (!isAdminMode || !adminIsWorkDay) && <div className="h-6" />}
```

Will become two separate conditions:
```tsx
{/* Admin rest day: show D */}
{isAdminMode && !shift && !absence && !adminIsWorkDay && (
  <div className="h-6 rounded text-[10px] font-bold flex items-center justify-center bg-gray-100 text-gray-500 border border-gray-300">
    D
  </div>
)}
{/* Empty: non-admin with no shift/absence */}
{!isAdminMode && !shift && !absence && <div className="h-6" />}
```

And a new legend entry:
```tsx
<div className="flex items-center gap-1">
  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded text-[8px] font-bold text-gray-500 flex items-center justify-center">D</div>
  <span>Descanso</span>
</div>
```
