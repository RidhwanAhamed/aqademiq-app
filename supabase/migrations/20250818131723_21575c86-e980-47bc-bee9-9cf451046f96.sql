-- Enable real-time for calendar tables
ALTER TABLE schedule_blocks REPLICA IDENTITY FULL;
ALTER TABLE exams REPLICA IDENTITY FULL; 
ALTER TABLE assignments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE schedule_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE exams;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;