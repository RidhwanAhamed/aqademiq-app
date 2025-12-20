-- Make study-files bucket public so files can be viewed/downloaded
-- The bucket already has proper RLS policies restricting who can upload
-- Making it public only allows READ access via direct URL
-- URLs are already protected by being non-guessable (they contain user_id + course_id + timestamp)

UPDATE storage.buckets 
SET public = true 
WHERE id = 'study-files';