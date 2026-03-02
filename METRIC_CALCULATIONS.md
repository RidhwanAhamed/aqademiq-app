# Aqademiq Analytics: Metric Calculation Logic

This document details how the proprietary metrics in the Weekly Report are calculated from raw user activity data.

## 1. Strain (0.0 - 21.0)
**Definition**: A logarithmic score of daily mental exertion.
**Source**: `study_sessions` (duration).

**Formula**:
- **Base Unit**: Study Hours.
- **Scaling**: A non-linear curve where it gets progressively harder to increase the score.
  - 0 hours = 0.0 Strain
  - 4 hours ≈ 10.0 Strain (Moderate)
  - 8 hours = 21.0 Strain (Max Human Limit)
- **Calculation in Code**:
  ```typescript
  const strain = Math.min(21, Math.round((totalStudyHours / 8) * 21 * 10) / 10);
  ```
- **Why**: This prevents "studying for 24 hours" from looking linearly 3x better than 8 hours, reflecting diminishing cognitive returns.

## 2. Recovery (0% - 100%)
**Definition**: The user's estimated capacity to perform today.
**Source**: Inferred from `study_sessions` timestamps (Sleep Gap).

**Formula**:
- **Sleep Inference**: The time gap between the *last* session of the previous day and the *first* session of the current day.
  - `Gap = (Today_First_Start - Yesterday_Last_End)`
  - `Estimated_Sleep = Gap - 1 hour (wind down buffering)`
  - Clamped between 4h and 10h.
- **Recovery Calculation**:
  - Primary Factor: Sleep. 8 hours of estimated sleep = 100% Base Recovery.
  - `Recovery = (Estimated_Sleep / 8) * 100` (Capped at 99%)
- **Color Coding**:
  - **Green (>66%)**: "Primed"
  - **Yellow (33-66%)**: "Ready"
  - **Red (<33%)**: "Overreach"

## 3. Focus Score (0 - 10)
**Definition**: The average quality of study sessions for the day.
**Source**: `study_sessions.focus_score` (User input or AI-determined during session).

**Formula**:
- `Daily_Focus = Average(focus_score) of all sessions that day`.
- If no sessions, defaults to 0 (or dashes).

## 4. Subject Mastery (0 - 100)
**Definition**: Competence level in a specific subject.
**Source**: `assignments.grade`.

**Formula**:
- Group all assignments by `course_id`.
- `Mastery = Average(grade)` for that course.
- **Radar Chart Benchmark**:
  - The "Class Average" (purple line) is currently a static benchmark (e.g., 85%) to encourage high performance.

## 5. Daily Energy Curve (Hourly)
**Definition**: When the user is most productive during the day.
**Source**: `study_sessions` timestamps + `focus_score`.

**Formula**:
- Bucket all sessions from the last 7 days into 24 hour slots (0-23).
- `Hourly_Energy = Average(focus_score)` for sessions occurring in that hour.
- This reveals the user's "Chronotype" (e.g., Morning Lark vs Night Owl).

---

**Note**: In the demo version, if no real data is found, a "Robust Generator" fills these charts with realistic patterns (e.g., a "High Strain/Low Recovery" overtraining cycle) to demonstrate the visualization capabilities.
