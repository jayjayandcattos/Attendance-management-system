# Draft: Course Images Not Showing on Message Icons

## Requirements (confirmed)
- Courses can have a `coverColor` that is either a hex color (e.g., `#3b82f6`) or an image path (e.g., `/bg/1.jpg`)
- When a course has an image-based cover, it doesn't display in the Messages page sidebar
- The affected UI is the course "channel avatar" (the circular icon next to each course in the messages sidebar)

## Technical Findings

### Data Model
- `Course.coverColor` (String) — stores either a hex color OR a path to a static image in `frontend/public/bg/`
- The `Course` entity has NO separate image field — images are stored as paths in `coverColor`
- This is a dual-purpose field

### The Bug: Root Cause
In both `Messages.tsx` (teacher and student), the course channel avatar is rendered as:

```tsx
<div className="channel-avatar" style={{ background: c.coverColor || 'var(--accent-blue)' }}>
```

This works when `coverColor` is a hex color like `#3b82f6`, but **fails** when `coverColor` is an image path like `/bg/1.jpg` because raw file paths are not valid CSS `background` values.

Other components (Courses.tsx, Dashboard.tsx) use a `getCourseBg()` helper function that properly wraps image paths in `url(...)`. **Messages.tsx doesn't use this helper.**

### Same Issue in Chat Header
The chat header also suffers from the same problem:

```tsx
background: courses.find((c) => c.id === selectedCourse)?.coverColor || 'var(--accent-blue)'
```

### Other Components That Handle It Correctly
- `teacher/Dashboard.tsx` — uses `getCourseBg(c.coverColor, idx)`
- `teacher/Courses.tsx` — uses `getCourseBg(c.coverColor, idx)`
- `student/Dashboard.tsx` — uses `getCourseBg(cd.course.coverColor, idx)`
- `student/Courses.tsx` — uses `getCourseBg(c.coverColor, idx)`

### Missing Avatar Field in Conversations API
- `getConversations` in both `TeacherController.java` and `StudentController.java` does NOT include `avatar` in the conversation response map
- The frontend's `Avatar` component uses `conv.avatar` for sidebar DM avatars
- This means user avatars also don't show up in the DM sidebar (fall back to initials)

## User Decisions
1. **Scope**: Fix all issues (course images + conversations API avatar field + chat header)
2. **Utility**: Extract shared `getCourseBg` utility function
