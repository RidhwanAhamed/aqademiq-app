# Aqademiq - Academic Planning Platform

## Project info

**URL**: https://lovable.dev/projects/48f8950b-43ad-4931-ad31-927b47b786b3

## How to replace mock data with real API

The calendar and scheduling features use an API abstraction layer in `src/services/api.ts`. 

### Current Implementation (Supabase)
The API helpers currently use Supabase directly:

```typescript
import { createScheduleBlock, detectScheduleConflicts, deleteScheduleBlock } from '@/services/api';

// Create a calendar event
const result = await createScheduleBlock({
  title: 'Study Session',
  specific_date: '2025-12-04',
  start_time: '19:00',
  end_time: '20:30',
  source: 'ada-ai',
  user_id: 'user-uuid'
});

// Check for conflicts
const { conflicts } = await detectScheduleConflicts({
  start_time: '19:00',
  end_time: '20:30',
  specific_date: '2025-12-04',
  user_id: 'user-uuid'
});

// Undo/delete event
await deleteScheduleBlock('block-id', 'user-uuid');
```

### Switching to Custom Backend API

To replace Supabase with your own backend API, update `src/services/api.ts`:

```typescript
// Replace Supabase calls with axios/fetch:
export const createScheduleBlock = async (payload) => {
  const response = await axios.post('/api/calendar/events', payload);
  return response.data;
};

export const detectScheduleConflicts = async (payload) => {
  const response = await axios.post('/api/calendar/conflicts', payload);
  return response.data;
};

export const deleteScheduleBlock = async (blockId, userId) => {
  const response = await axios.delete(`/api/calendar/events/${blockId}`);
  return response.data.success;
};
```

### Achievement Badge APIs

The badge service currently reads from `src/data/badges.json` and stores unlocks in `localStorage`. When wiring up the real Node/Express backend, point the achievement helpers to REST endpoints such as:

```ts
// TODO: Replace mock services with real endpoints
export const getBadges = () => axios.get('/api/achievements/badges').then(res => res.data);
export const getUserBadges = (userId: string) =>
  axios.get(`/api/achievements/user/${userId}`).then(res => res.data);
export const awardBadge = (userId: string, badgeId: string) =>
  axios.post('/api/achievements/award', { userId, badgeId }).then(res => res.data);
```

These three functions back `useAchievements()` and the new Ada’s Apprentice badge unlocker, so once the endpoints return `{ success: boolean; badge: Badge }` payloads the frontend will require no further changes.

### Ada AI Agentic Actions

The Ada AI assistant (`supabase/functions/ai-chat/index.ts`) returns structured actions:

```json
{
  "response": "I'll schedule that for you!",
  "metadata": {
    "actions": [
      {
        "type": "CREATE_EVENT",
        "title": "DLCV Study Session",
        "start_iso": "2025-12-04T19:00:00Z",
        "end_iso": "2025-12-04T20:30:00Z"
      }
    ],
    "has_actions": true
  }
}
```

The frontend (`src/components/AdaAIChat.tsx`) handles these actions with:
1. Inline confirmation prompts
2. Conflict detection before insert
3. Undo functionality via toast action

## Voice to Text Capture

Ada’s chat input now ships with browser-based speech-to-text powered by the Web Speech API inside `src/hooks/useSpeechToText.ts`. The hook sanitizes transcripts via `src/utils/voice-cleaner.ts` to remove filler words before shipping tokens to Gemini. When you are ready to replace this mock with the real backend, call your transcription service before resolving the hook:

```ts
// TODO: Swap Web Speech API with backend STT
const response = await fetch('/api/transcripts', {
  method: 'POST',
  body: audioBlob,
});
const { cleanedTranscript } = await response.json();
setTranscript(cleanedTranscript);
```

`src/components/AdaAIChat.tsx` already expects promises from the hook, so the frontend will work unchanged once `/api/transcripts` (or a Gemini/S3 pipeline) returns the processed text.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/48f8950b-43ad-4931-ad31-927b47b786b3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/48f8950b-43ad-4931-ad31-927b47b786b3) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
