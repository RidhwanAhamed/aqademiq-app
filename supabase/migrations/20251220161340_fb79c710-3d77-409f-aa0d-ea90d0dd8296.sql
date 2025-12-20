-- Revert study-files bucket to private for maximum security
-- Files will only be accessible via authenticated signed URLs
UPDATE storage.buckets 
SET public = false 
WHERE id = 'study-files';