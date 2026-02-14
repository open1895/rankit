
-- Allow users to read their own votes
CREATE POLICY "Users can view own votes"
ON public.votes FOR SELECT
USING (auth.uid() = user_id);
