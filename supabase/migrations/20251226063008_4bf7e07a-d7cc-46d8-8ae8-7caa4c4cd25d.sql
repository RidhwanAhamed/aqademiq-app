
-- Delete all events for user mohammed.aswath07@gmail.com on 27th December 2025
DELETE FROM schedule_blocks 
WHERE user_id = 'b8a4d348-2cc4-4e68-8543-7f1465ff03d7' 
AND specific_date = '2025-12-27';

DELETE FROM study_sessions 
WHERE user_id = 'b8a4d348-2cc4-4e68-8543-7f1465ff03d7' 
AND scheduled_start::date = '2025-12-27';

DELETE FROM exams 
WHERE user_id = 'b8a4d348-2cc4-4e68-8543-7f1465ff03d7' 
AND exam_date::date = '2025-12-27';

DELETE FROM assignments 
WHERE user_id = 'b8a4d348-2cc4-4e68-8543-7f1465ff03d7' 
AND due_date::date = '2025-12-27';
