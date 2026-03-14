
ALTER TABLE battle_votes DROP CONSTRAINT battle_votes_voted_creator_id_fkey;
ALTER TABLE battle_votes ADD CONSTRAINT battle_votes_voted_creator_id_fkey FOREIGN KEY (voted_creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE battles DROP CONSTRAINT battles_creator_a_id_fkey;
ALTER TABLE battles ADD CONSTRAINT battles_creator_a_id_fkey FOREIGN KEY (creator_a_id) REFERENCES creators(id) ON DELETE CASCADE;
ALTER TABLE battles DROP CONSTRAINT battles_creator_b_id_fkey;
ALTER TABLE battles ADD CONSTRAINT battles_creator_b_id_fkey FOREIGN KEY (creator_b_id) REFERENCES creators(id) ON DELETE CASCADE;
ALTER TABLE battles DROP CONSTRAINT battles_winner_id_fkey;
ALTER TABLE battles ADD CONSTRAINT battles_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE boost_campaigns DROP CONSTRAINT boost_campaigns_creator_id_fkey;
ALTER TABLE boost_campaigns ADD CONSTRAINT boost_campaigns_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_creator_id_fkey;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE comments DROP CONSTRAINT comments_creator_id_fkey;
ALTER TABLE comments ADD CONSTRAINT comments_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE creator_earnings DROP CONSTRAINT creator_earnings_creator_id_fkey;
ALTER TABLE creator_earnings ADD CONSTRAINT creator_earnings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE creator_feed_posts DROP CONSTRAINT creator_feed_posts_creator_id_fkey;
ALTER TABLE creator_feed_posts ADD CONSTRAINT creator_feed_posts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE creator_rewards DROP CONSTRAINT creator_rewards_creator_id_fkey;
ALTER TABLE creator_rewards ADD CONSTRAINT creator_rewards_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE hall_of_fame DROP CONSTRAINT hall_of_fame_creator_id_fkey;
ALTER TABLE hall_of_fame ADD CONSTRAINT hall_of_fame_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE posts DROP CONSTRAINT posts_creator_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE prediction_events DROP CONSTRAINT prediction_events_creator_a_id_fkey;
ALTER TABLE prediction_events ADD CONSTRAINT prediction_events_creator_a_id_fkey FOREIGN KEY (creator_a_id) REFERENCES creators(id) ON DELETE CASCADE;
ALTER TABLE prediction_events DROP CONSTRAINT prediction_events_creator_b_id_fkey;
ALTER TABLE prediction_events ADD CONSTRAINT prediction_events_creator_b_id_fkey FOREIGN KEY (creator_b_id) REFERENCES creators(id) ON DELETE CASCADE;
ALTER TABLE prediction_events DROP CONSTRAINT prediction_events_winner_id_fkey;
ALTER TABLE prediction_events ADD CONSTRAINT prediction_events_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE rank_history DROP CONSTRAINT rank_history_creator_id_fkey;
ALTER TABLE rank_history ADD CONSTRAINT rank_history_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE season_awards DROP CONSTRAINT season_awards_creator_id_fkey;
ALTER TABLE season_awards ADD CONSTRAINT season_awards_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE season_rankings DROP CONSTRAINT season_rankings_creator_id_fkey;
ALTER TABLE season_rankings ADD CONSTRAINT season_rankings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE tournament_champions DROP CONSTRAINT tournament_champions_creator_id_fkey;
ALTER TABLE tournament_champions ADD CONSTRAINT tournament_champions_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE tournament_matches DROP CONSTRAINT tournament_matches_creator_a_id_fkey;
ALTER TABLE tournament_matches ADD CONSTRAINT tournament_matches_creator_a_id_fkey FOREIGN KEY (creator_a_id) REFERENCES creators(id) ON DELETE CASCADE;
ALTER TABLE tournament_matches DROP CONSTRAINT tournament_matches_creator_b_id_fkey;
ALTER TABLE tournament_matches ADD CONSTRAINT tournament_matches_creator_b_id_fkey FOREIGN KEY (creator_b_id) REFERENCES creators(id) ON DELETE CASCADE;
ALTER TABLE tournament_matches DROP CONSTRAINT tournament_matches_winner_id_fkey;
ALTER TABLE tournament_matches ADD CONSTRAINT tournament_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE votes DROP CONSTRAINT votes_creator_id_fkey;
ALTER TABLE votes ADD CONSTRAINT votes_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE weekly_highlights DROP CONSTRAINT weekly_highlights_creator_id_fkey;
ALTER TABLE weekly_highlights ADD CONSTRAINT weekly_highlights_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;
