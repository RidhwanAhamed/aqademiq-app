# Weekly Report Metrics - Quick Reference

## Metrics Breakdown

### **Strain**
- **Calculation**: `(Total Study Hours / 8) × 21`
- **Source Table**: `study_sessions`
- **Source Column**: `actual_end - actual_start`

### **Recovery**
- **Calculation**: `(Sleep Hours / 8) × 100`
- **Source Table**: `study_sessions`
- **Source Column**: Gap between `actual_end` (yesterday) and `actual_start` (today)

### **Sleep**
- **Calculation**: Gap between last session yesterday and first session today, minus 1 hour
- **Source Table**: `study_sessions`
- **Source Column**: `actual_end` and `actual_start`

### **Procrastination (The Void)**
- **Calculation**: `24 - Work Hours - Sleep Hours`
- **Source Table**: `study_sessions`
- **Source Column**: Derived from session durations

### **Focus Score**
- **Calculation**: Average of all session focus scores for the day
- **Source Table**: `study_sessions`
- **Source Column**: `focus_score`

### **Work Hours**
- **Calculation**: Sum of all session durations for the day
- **Source Table**: `study_sessions`
- **Source Column**: `actual_end - actual_start`

### **Daily Energy Curve**
- **Calculation**: Average focus score grouped by hour of day
- **Source Table**: `study_sessions`
- **Source Column**: `focus_score` grouped by hour from `actual_start`

### **Subject Performance (Radar Chart)**
- **Calculation**: Average grade per course
- **Source Table**: `assignments` and `exams`
- **Source Column**: `grade_points` grouped by `course_id`

### **Top Subject**
- **Calculation**: Course with highest average grade
- **Source Table**: `assignments` and `exams`
- **Source Column**: `grade_points` grouped by `courses.name`

### **Weakest Subject**
- **Calculation**: Course with lowest average grade
- **Source Table**: `assignments` and `exams`
- **Source Column**: `grade_points` grouped by `courses.name`

### **Benchmark (Radar Chart)**
- **Calculation**: Fixed comparison value (usually 85%)
- **Source Table**: None (hardcoded constant)
- **Source Column**: N/A


---

## Example Data Flow for "Strain"

1. **Database Query**: Fetch all `study_sessions` where `user_id = YOUR_ID` and `status = 'completed'` for the last 7 days
2. **Extract Duration**: For each session, calculate `(actual_end - actual_start)` in hours
3. **Sum Daily Hours**: Add up all session durations for each day
4. **Apply Formula**: `Strain = (Daily Hours / 8) × 21`
5. **Display**: Show as a bar in the chart

---

## Example Data Flow for "Subject Performance"

1. **Database Query**: 
   - Fetch all `assignments` where `user_id = YOUR_ID` and `grade_points IS NOT NULL`
   - Fetch all `exams` where `user_id = YOUR_ID` and `grade_points IS NOT NULL`
2. **Group by Course**: Use `course_id` to group grades
3. **Calculate Average**: For each course, `AVG(grade_points)`
4. **Map to Name**: Use `courses.name` to get readable labels (e.g., "Math", "Physics")
5. **Display**: Show as a radar chart with one axis per subject
