# Master Game Plan: Aqademiq Integration

This guide is designed to be your **step-by-step manual** to connect all the powerful features of your app—Supabase (Backend), Sound Engine via Capacitor, Haptics via Capacitor, and Smart Planning Logic—into a cohesive experience.

> **Goal**: Create a seamless, "native-feeling" app where actions have weight (haptics), atmosphere (sound), and intelligence (smart planning), all backed by real data (Supabase).

---

## Phase 1: The Brain (Supabase Backend) 🧠
*Goal: Connect the app to real data so it remembers user progress.*

### 1.1. Verify Database Tables
First, ensure your Supabase project has these core tables. Go to your Supabase Dashboard > SQL Editor and run this check/create script:

```sql
-- Core Tables for Aqademiq
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  code text,
  color text,
  credits int,
  created_at timestamptz default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  course_id uuid references courses,
  title text not null,
  due_date timestamptz,
  is_completed boolean default false,
  status text default 'pending', -- 'pending', 'in_progress', 'completed'
  priority int default 2 -- 1=High, 2=Medium, 3=Low
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  course_id uuid references courses,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes int,
  focus_score int default 0, -- gamification metric
  status text default 'completed'
);

create table if not exists user_settings (
  user_id uuid primary key references auth.users,
  soundscape_enabled boolean default true,
  haptics_enabled boolean default true,
  daily_goal_minutes int default 120
);
```

### 1.2. Connect the "Nerves" (API Services)
Your app needs to talk to these tables.
- **Action**: Update `src/hooks/useCourses.ts` and `src/hooks/useAssignments.ts`.
- **Logic**:
    - *Fetch*: `supabase.from('table').select('*').eq('user_id', user.id)`
    - *Create*: `supabase.from('table').insert({ ...data, user_id: user.id })`
    - *Realtime*: `supabase.channel('table_changes').on(...)` (Optional for Phase 1, but great for "wow" factor).

---

## Phase 2: The Heart (Sound & Feeling) ❤️
*Goal: Make the app feel alive.*

### 2.1. Haptic Feedback (Evaluation)
We already have `src/services/haptics.ts`.
- **Usage Strategy**: Don't overuse it!
- **Good Places**:
    - **Selection**: Changing tabs or sliders -> `haptics.selectionChanged()`
    - **Success**: Completing a timer/task -> `haptics.success()` (distinct double-tap)
    - **Error**: Form validation fail -> `haptics.error()`
    - **Heavy**: Long press on an item -> `haptics.heavy()`
- **Implementation**:
    Go to `src/components/Timer.tsx` (or similar) and add:
    ```typescript
    import { haptics } from '@/services/haptics';
    // Inside meaningful actions:
    const handleComplete = () => {
       haptics.success();
       // ... other logic
    };
    ```

### 2.2. Soundscape Engine (Atmosphere)
We have `src/hooks/useSoundscape.ts`.
- **Current Status**: It saves settings to `localStorage`.
- **Upgrade**: Sync preferences to Supabase `user_settings` table so their preferences follow them across devices.
- **Trigger**:
    - When `Timer` starts -> `soundscape.play()`
    - When `Timer` pauses -> `soundscape.pause()` (or fade out)
    - **Smart Feature**: If `studyType` is "Deep Focus", switch soundscape to "White Noise" or "Rain" automatically.

---

## Phase 3: The Manager (Smart Planning) 📅
*Goal: Intelligent suggestions.*

### 3.1. The "Smart Scheduler"
We have `src/hooks/useSmartScheduler.ts` calling a Supabase Function `smart-scheduler`.
- **How it works**:
    1.  Frontend sends: "I have these 3 assignments due Friday."
    2.  Edge Function (AI): "I suggest studying Assignment A on Wed 2pm-4pm."
    3.  Frontend: Displays "Proposed Schedule".
    4.  User accepts -> Saves to `study_sessions` (scheduled).
- **Integration Step**:
    - Ensure the Edge Function is deployed (`supabase functions deploy smart-scheduler`).
    - Verify the `useSmartScheduler` hook correctly handles the response.
    - **Beginner Tip**: If you don't have the AI function yet, write a simple JS algorithm in the frontend first that just finds "free slots" in their calendar.

---

## Phase 4: The "Beginner Friendly" UI Polish ✨
*Goal: Make it easy to understand.*

1.  **Onboarding Matters**:
    - When the user first logs in, ask: "Do you want background sounds while studying?" (Yes/No). Save to `user_settings`.
2.  **Visual Feedback**:
    - When Haptics trigger, show a visual ripple or bounce.
    - When Sound plays, show an equalizer animation (we have `App.css` animations?).
3.  **Empty States**:
    - If `courses` is empty, don't show a blank screen. Show a button: "Add your first Course".

## 🚀 Execution Checklist

- [ ] **DB**: Run SQL script in Supabase.
- [ ] **API**: Verify `useCourses` fetches real data.
- [ ] **Haptics**: Add `haptics.selectionChanged()` to the main Tab Bar navigation.
- [ ] **Sound**: Connect `Timer` start/stop to `useSoundscape`.
- [ ] **Planning**: detailed in `useSmartScheduler`, test the "Generate Schedule" button.
