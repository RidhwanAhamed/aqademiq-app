
-- Add conversation_id column to chat_messages
ALTER TABLE chat_messages ADD COLUMN conversation_id UUID;

-- Create index for efficient conversation queries
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);

-- Update existing messages to have a conversation_id (one per user)
UPDATE chat_messages
SET conversation_id = gen_random_uuid()
WHERE conversation_id IS NULL AND user_id IS NOT NULL;

-- Add RLS policy for conversation access
CREATE POLICY "Users can access own conversations"
ON chat_messages FOR SELECT
USING (auth.uid() = user_id);
