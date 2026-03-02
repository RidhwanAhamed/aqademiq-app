# Aqademiq Weekly Report: Metric Calculation Reference

This document details exactly how each metric in the generated Weekly Report is calculated.

## 1. Core Energy & Performance Metrics

These metrics appear in the top-level stats and the main bar chart.

### **Strain (Daily Work Load)**
*   **Definition**: A measure of the total cognitive load placed on the user for a given day.
*   **Formula**:
    `Strain = (Total Study Hours / 8) * 21`
    *   **Total Study Hours**: The sum of durations of all study sessions for that day.
    *   **Scaling**: It assumes an 8-hour workday corresponds to a "Strain" score of 21 (inspired by athletic strain metrics).
    *   **Cap**: The value is capped at 21.
    *   **Visual Color**:
        *   Red (> 18): High Strain
        *   Yellow (10 - 18): Moderate
        *   Green (< 10): Low / Recovery

### **Recovery (Rest & Balance)**
*   **Definition**: A score (0-100%) indicating how well the user has recovered from previous work, primarily driven by sleep estimation.
*   **Formula**:
    `Recovery (%) = (Estimated Sleep Hours / 8) * 100`
    *   **Estimated Sleep Hours**: Calculated by looking at the gap between the last session of the *previous day* and the first session of the *current day*.
        *   *Gap Logic*: `Sleep = (First Session Start Today - Last Session End Yesterday) - 1 hour (buffer)`
        *   *Bounds*: Sleep is clamped between 4 and 10 hours for realism.
        *   *Default*: If no session data exists for the gap, defaults to 7.5 hours.
    *   **Cap**: Capped at 99%.

### **Sleep (Hours)**
*   **Definition**: The estimated hours of sleep obtained the night before.
*   **Formula**: Same logic as "Recovery" (Gap analysis), rounded to 1 decimal place.

### **Procrastination ("The Void")**
*   **Definition**: Time unaccounted for in a 24-hour cycle that isn't Work or Sleep.
*   **Formula**:
    `Procrastination = 24 - Work Hours - Estimated Sleep Hours`
    *   *Note*: This captures leisure, eating, commuting, and idleness.

### **Focus Score (Pulse)**
*   **Definition**: The average quality of attention during work sessions.
*   **Source**: User-inputted "Focus Score" from study sessions (1-10 scale).
*   **Formula**: Average of all session focus scores for that day. Defaults to 5 if not recorded.

---

## 2. Advanced Analysis

### **Daily Energy Curve (Line Chart)**
*   **Definition**: Visualizes the user's focus/energy levels at key times of the day.
*   **Data Points**: Sampled at 6am, 9am, 12pm, 3pm, 6pm, 9pm, 12am.
*   **Calculation**:
    *   For each time bucket (e.g., 9am - 12pm), we average the focus scores of sessions occurring in that window.
    *   If no data is available for a time slot, it uses a random variance around 50-70 to simulate a natural curve (placeholder behavior).

### **Subject Breakdown (Radar Chart)**
*   **Definition**: Compares performance across different academic subjects.
*   **Formula**:
    *   **Metric A (Performance)**: Average percentage grade of all Assignments and Exams tagged with that Subject/Course.
    *   **Metric B (Benchmark)**: A fixed or calculated benchmark (currently often set to class average or a standard 85% for comparison).

---

## 3. Textual Analysis Logic

The "Briefing" text is dynamically generated based on the data:

*   **"The Void" Analysis**:
    *   *Condition*: If `Average Procrastination > 5 hours/day`.
    *   *Output*: Warns the user they are losing significant time and suggests tightening the routine.
    *   *Else*: Praises the user for elite time management.

*   **Pulse Analysis (Consistency)**:
    *   *Condition*: If `(Strain * Focus)` average is high (> 80).
    *   *Output*: "Rhythmic and strong" pulse.
    *   *Else*: "Erratic" pulse, warning of burnout or inconsistency.

*   **Mastery Analysis**:
    *   *Logic*: Identifies the highest-performing subject vs. the lowest-performing subject.
    *   *Output*: Suggests shifting 20% of study time from the strongest subject to the weakest one.

---

## 4. Demo Mode Trigger

*   **Trigger**: If the calculated `Total Weekly Strain < 5` (i.e., very little data logged).
*   **Effect**: The report populates with "Demo Data" (perfect curves, diverse subject grades) to show the user what the report *could* look like, ensuring the UI never looks empty or broken.

---

## 5. Data Architecture & Database Schema

This report is **100% Dynamic** and calculated in real-time on your device using data from your Supabase database.

### **Database Tables Used**

The Weekly Report pulls data from these core tables in the `public` schema:

#### **1. `study_sessions` Table**
*   **Purpose**: Stores every study session you log.
*   **Key Columns**:
    *   `id` (UUID): Unique session identifier
    *   `user_id` (UUID): Links to your account (enforced by Row Level Security)
    *   `course_id` (UUID): Optional link to a course
    *   `assignment_id` (UUID): Optional link to an assignment
    *   `exam_id` (UUID): Optional link to an exam
    *   `title` (TEXT): Session name
    *   `scheduled_start` (TIMESTAMP): When the session was planned to start
    *   `scheduled_end` (TIMESTAMP): When the session was planned to end
    *   `actual_start` (TIMESTAMP): When you actually started
    *   `actual_end` (TIMESTAMP): When you actually finished
    *   `status` (TEXT): `'scheduled'`, `'in_progress'`, `'completed'`, or `'skipped'`
    *   `focus_score` (INTEGER): Your self-rated focus (1-10 scale)
    *   `created_at`, `updated_at` (TIMESTAMP): Audit timestamps

*   **Used For**:
    *   **Strain Calculation**: Duration = `actual_end - actual_start` (or scheduled if actual is null)
    *   **Focus Score**: Direct mapping
    *   **Sleep Estimation**: Gap analysis between sessions across days
    *   **Hourly Energy Curve**: Grouping sessions by hour of day

#### **2. `assignments` Table**
*   **Purpose**: Stores homework, essays, projects, quizzes, and labs.
*   **Key Columns**:
    *   `id` (UUID): Unique assignment identifier
    *   `user_id` (UUID): Your account
    *   `course_id` (UUID): Links to a course
    *   `title` (TEXT): Assignment name
    *   `due_date` (TIMESTAMP): Deadline
    *   `is_completed` (BOOLEAN): Completion status
    *   `grade_received` (TEXT): Letter grade (A, B, C, D, F)
    *   `grade_points` (DECIMAL): Numeric grade (0-100 scale)
    *   `assignment_type` (TEXT): `'homework'`, `'essay'`, `'project'`, `'quiz'`, `'lab'`

*   **Used For**:
    *   **Subject Breakdown (Radar Chart)**: Averaging `grade_points` by `course_id`
    *   **Mastery Analysis**: Identifying strongest vs. weakest subjects

#### **3. `exams` Table**
*   **Purpose**: Stores midterms, finals, quizzes, and tests.
*   **Key Columns**:
    *   `id` (UUID): Unique exam identifier
    *   `user_id` (UUID): Your account
    *   `course_id` (UUID): Links to a course
    *   `title` (TEXT): Exam name
    *   `exam_date` (TIMESTAMP): When the exam occurs
    *   `grade_received` (TEXT): Letter grade
    *   `grade_points` (DECIMAL): Numeric grade (0-100 scale)
    *   `exam_type` (TEXT): `'midterm'`, `'final'`, `'quiz'`, `'test'`

*   **Used For**:
    *   **Subject Breakdown (Radar Chart)**: Combined with assignments for overall performance
    *   **Performance Trends**: Tracking grade changes over time

#### **4. `courses` Table**
*   **Purpose**: Stores your enrolled courses.
*   **Key Columns**:
    *   `id` (UUID): Unique course identifier
    *   `user_id` (UUID): Your account
    *   `name` (TEXT): Course name (e.g., "Calculus II")
    *   `code` (TEXT): Course code (e.g., "MATH201")
    *   `color` (TEXT): UI color for visual grouping
    *   `is_active` (BOOLEAN): Whether the course is current

*   **Used For**:
    *   **Subject Mapping**: Translating `course_id` to readable names in charts

---

### **Data Flow Pipeline**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER LOGS DATA                                               │
│    - Completes a study session                                  │
│    - Submits an assignment                                      │
│    - Records an exam grade                                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SUPABASE DATABASE (PostgreSQL)                               │
│    - Data is stored in `study_sessions`, `assignments`, `exams` │
│    - Row Level Security ensures you only see YOUR data          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. REACT HOOKS (Client-Side Fetch)                              │
│    - `useStudySessions()` → Fetches from `study_sessions`       │
│    - `useAssignments()` → Fetches from `assignments`            │
│    - `useExams()` → Fetches from `exams`                        │
│    - `useCourses()` → Fetches from `courses`                    │
│    Location: `src/hooks/useStudySessions.ts` (and similar)      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ANALYTICS PAGE (Data Aggregation)                            │
│    - `AdvancedAnalytics.tsx` calls all hooks                    │
│    - Passes raw data arrays as props to `WeeklyReportModal`     │
│    Location: `src/pages/AdvancedAnalytics.tsx`                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. WEEKLY REPORT COMPONENT (Calculation Engine)                 │
│    - Receives: `studySessions[]`, `assignments[]`, `exams[]`    │
│    - Runs formulas from this document (useMemo for performance) │
│    - Generates charts, text, and metrics in real-time           │
│    Location: `src/components/analytics/WeeklyReportModal.tsx`   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. USER SEES REPORT                                             │
│    - All calculations happen in your browser (Client-Side)      │
│    - No server processing = Instant updates + Full privacy      │
└─────────────────────────────────────────────────────────────────┘
```

---

### **Privacy & Security**

*   **Row Level Security (RLS)**: Every table has a policy that enforces `auth.uid() = user_id`, meaning you can ONLY access your own data.
*   **Client-Side Calculations**: All formulas run in your browser. Your raw data never leaves your device for processing.
*   **Real-Time Updates**: When you log a new session, React's `useEffect` detects the change and automatically re-fetches data, triggering a recalculation.

