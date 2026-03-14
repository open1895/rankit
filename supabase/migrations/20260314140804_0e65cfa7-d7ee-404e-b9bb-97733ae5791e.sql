
-- Drop and recreate all FK constraints referencing creators with ON DELETE CASCADE

-- votes
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_creator_id_fkey;
ALTER TABLE public.votes ADD CONSTRAINT votes_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- battles
ALTER TABLE public.battles DROP CONSTRAINT IF EXISTS battles_creator_a_id_fkey;
ALTER TABLE public.battles ADD CONSTRAINT battles_creator_a_id_fkey FOREIGN KEY (creator_a_id) REFERENCES public.creators(id) ON DELETE CASCADE;
ALTER TABLE public.battles DROP CONSTRAINT IF EXISTS battles_creator_b_id_fkey;
ALTER TABLE public.battles ADD CONSTRAINT battles_creator_b_id_fkey FOREIGN KEY (creator_b_id) REFERENCES public.creators(id) ON DELETE CASCADE;
ALTER TABLE public.battles DROP CONSTRAINT IF EXISTS battles_winner_id_fkey;
ALTER TABLE public.battles ADD CONSTRAINT battles_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- battle_votes
ALTER TABLE public.battle_votes DROP CONSTRAINT IF EXISTS battle_votes_voted_creator_id_fkey;
ALTER TABLE public.battle_votes ADD CONSTRAINT battle_votes_voted_creator_id_fkey FOREIGN KEY (voted_creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- comments
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_creator_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- posts
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_creator_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- rank_history
ALTER TABLE public.rank_history DROP CONSTRAINT IF EXISTS rank_history_creator_id_fkey;
ALTER TABLE public.rank_history ADD CONSTRAINT rank_history_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- chat_messages
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_creator_id_fkey;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- creator_feed_posts
ALTER TABLE public.creator_feed_posts DROP CONSTRAINT IF EXISTS creator_feed_posts_creator_id_fkey;
ALTER TABLE public.creator_feed_posts ADD CONSTRAINT creator_feed_posts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- creator_rewards
ALTER TABLE public.creator_rewards DROP CONSTRAINT IF EXISTS creator_rewards_creator_id_fkey;
ALTER TABLE public.creator_rewards ADD CONSTRAINT creator_rewards_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- creator_earnings
ALTER TABLE public.creator_earnings DROP CONSTRAINT IF EXISTS creator_earnings_creator_id_fkey;
ALTER TABLE public.creator_earnings ADD CONSTRAINT creator_earnings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- boost_campaigns
ALTER TABLE public.boost_campaigns DROP CONSTRAINT IF EXISTS boost_campaigns_creator_id_fkey;
ALTER TABLE public.boost_campaigns ADD CONSTRAINT boost_campaigns_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- hall_of_fame
ALTER TABLE public.hall_of_fame DROP CONSTRAINT IF EXISTS hall_of_fame_creator_id_fkey;
ALTER TABLE public.hall_of_fame ADD CONSTRAINT hall_of_fame_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- season_rankings
ALTER TABLE public.season_rankings DROP CONSTRAINT IF EXISTS season_rankings_creator_id_fkey;
ALTER TABLE public.season_rankings ADD CONSTRAINT season_rankings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- season_awards
ALTER TABLE public.season_awards DROP CONSTRAINT IF EXISTS season_awards_creator_id_fkey;
ALTER TABLE public.season_awards ADD CONSTRAINT season_awards_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- weekly_highlights
ALTER TABLE public.weekly_highlights DROP CONSTRAINT IF EXISTS weekly_highlights_creator_id_fkey;
ALTER TABLE public.weekly_highlights ADD CONSTRAINT weekly_highlights_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- prediction_events
ALTER TABLE public.prediction_events DROP CONSTRAINT IF EXISTS prediction_events_creator_a_id_fkey;
ALTER TABLE public.prediction_events ADD CONSTRAINT prediction_events_creator_a_id_fkey FOREIGN KEY (creator_a_id) REFERENCES public.creators(id) ON DELETE CASCADE;
ALTER TABLE public.prediction_events DROP CONSTRAINT IF EXISTS prediction_events_creator_b_id_fkey;
ALTER TABLE public.prediction_events ADD CONSTRAINT prediction_events_creator_b_id_fkey FOREIGN KEY (creator_b_id) REFERENCES public.creators(id) ON DELETE CASCADE;
ALTER TABLE public.prediction_events DROP CONSTRAINT IF EXISTS prediction_events_winner_id_fkey;
ALTER TABLE public.prediction_events ADD CONSTRAINT prediction_events_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- prediction_bets
ALTER TABLE public.prediction_bets DROP CONSTRAINT IF EXISTS prediction_bets_predicted_creator_id_fkey;
ALTER TABLE public.prediction_bets ADD CONSTRAINT prediction_bets_predicted_creator_id_fkey FOREIGN KEY (predicted_creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- settlement_requests
ALTER TABLE public.settlement_requests DROP CONSTRAINT IF EXISTS settlement_requests_creator_id_fkey;
ALTER TABLE public.settlement_requests ADD CONSTRAINT settlement_requests_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- tournament_matches
ALTER TABLE public.tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_creator_a_id_fkey;
ALTER TABLE public.tournament_matches ADD CONSTRAINT tournament_matches_creator_a_id_fkey FOREIGN KEY (creator_a_id) REFERENCES public.creators(id) ON DELETE CASCADE;
ALTER TABLE public.tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_creator_b_id_fkey;
ALTER TABLE public.tournament_matches ADD CONSTRAINT tournament_matches_creator_b_id_fkey FOREIGN KEY (creator_b_id) REFERENCES public.creators(id) ON DELETE CASCADE;
ALTER TABLE public.tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_winner_id_fkey;
ALTER TABLE public.tournament_matches ADD CONSTRAINT tournament_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- tournament_champions
ALTER TABLE public.tournament_champions DROP CONSTRAINT IF EXISTS tournament_champions_creator_id_fkey;
ALTER TABLE public.tournament_champions ADD CONSTRAINT tournament_champions_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;

-- tournament_votes
ALTER TABLE public.tournament_votes DROP CONSTRAINT IF EXISTS tournament_votes_voted_creator_id_fkey;
ALTER TABLE public.tournament_votes ADD CONSTRAINT tournament_votes_voted_creator_id_fkey FOREIGN KEY (voted_creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;
