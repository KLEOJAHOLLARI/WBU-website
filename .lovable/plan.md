

## Plan: Add Professor Info to Student Course Cards

### Overview
Show the assigned professor's name on each course card in the student portal, with a clickable link to a public professor profile page.

### Changes

**1. Create `/faculty/:id` — Public Professor Profile Page**
- New file: `src/pages/FacultyProfile.tsx`
- Fetches professor from `professors` table by ID
- Displays: photo, name, title, department, bio
- Clean, responsive layout using existing design patterns
- Handles not-found gracefully

**2. Add Route in `App.tsx`**
- Add `<Route path="/faculty/:id" element={<FacultyProfile />} />` before the catch-all

**3. Update `StudentCourses.tsx` — Enrolled Course Cards**
- Fetch all professor profiles for enrolled courses: query `profiles` table where `user_id` matches `course.professor_id` to get names
- Also query the `professors` table as a fallback (since professor_id on courses references auth users, not the `professors` display table)
- In `renderEnrolledCard`: show professor name below course code with a `User` icon
- Add a "View Profile" link that navigates to `/faculty/:professorId` — uses `e.stopPropagation()` to avoid triggering the parent Link
- Fallback: show "No professor assigned" in muted text when `professor_id` is null

**4. Update Course Catalog Cards**
- Same professor name display in the catalog section cards at the bottom of the page

### Data Flow
- `courses.professor_id` → `profiles.user_id` (get name for card display)
- `courses.professor_id` → used as route param for `/faculty/:id` profile page
- The profile page queries the `professors` table (public display data) — will need to match by name or add a lookup. Since `professors` table doesn't link to `auth.users`, the profile page will query `profiles` for the user info and `professors` table for extended bio/photo if available.

### No Breaking Changes
- All existing queries, routes, and components remain untouched
- Only additive changes: new query, new UI elements, new route

