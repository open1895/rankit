
-- battle_votes.battle_id -> battles(id)
ALTER TABLE battle_votes DROP CONSTRAINT IF EXISTS battle_votes_battle_id_fkey;
ALTER TABLE battle_votes ADD CONSTRAINT battle_votes_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE;

-- post_comments.post_id -> posts(id)
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- post_likes.post_id -> posts(id)
ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;
ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- creator_feed_likes.post_id -> creator_feed_posts(id)
ALTER TABLE creator_feed_likes DROP CONSTRAINT IF EXISTS creator_feed_likes_post_id_fkey;
ALTER TABLE creator_feed_likes ADD CONSTRAINT creator_feed_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES creator_feed_posts(id) ON DELETE CASCADE;

-- tournament_votes.match_id -> tournament_matches(id)
ALTER TABLE tournament_votes DROP CONSTRAINT IF EXISTS tournament_votes_match_id_fkey;
ALTER TABLE tournament_votes ADD CONSTRAINT tournament_votes_match_id_fkey FOREIGN KEY (match_id) REFERENCES tournament_matches(id) ON DELETE CASCADE;

-- tournament_matches.tournament_id -> tournaments(id)
ALTER TABLE tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_tournament_id_fkey;
ALTER TABLE tournament_matches ADD CONSTRAINT tournament_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- tournament_champions.tournament_id -> tournaments(id)
ALTER TABLE tournament_champions DROP CONSTRAINT IF EXISTS tournament_champions_tournament_id_fkey;
ALTER TABLE tournament_champions ADD CONSTRAINT tournament_champions_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- prediction_bets.event_id -> prediction_events(id)
ALTER TABLE prediction_bets DROP CONSTRAINT IF EXISTS prediction_bets_event_id_fkey;
ALTER TABLE prediction_bets ADD CONSTRAINT prediction_bets_event_id_fkey FOREIGN KEY (event_id) REFERENCES prediction_events(id) ON DELETE CASCADE;

-- boost_contributions.campaign_id -> boost_campaigns(id)
ALTER TABLE boost_contributions DROP CONSTRAINT IF EXISTS boost_contributions_campaign_id_fkey;
ALTER TABLE boost_contributions ADD CONSTRAINT boost_contributions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES boost_campaigns(id) ON DELETE CASCADE;

-- season_rankings.season_id -> seasons(id)
ALTER TABLE season_rankings DROP CONSTRAINT IF EXISTS season_rankings_season_id_fkey;
ALTER TABLE season_rankings ADD CONSTRAINT season_rankings_season_id_fkey FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- season_awards.season_id -> seasons(id)
ALTER TABLE season_awards DROP CONSTRAINT IF EXISTS season_awards_season_id_fkey;
ALTER TABLE season_awards ADD CONSTRAINT season_awards_season_id_fkey FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- board_post_comments.post_id -> board_posts(id)
ALTER TABLE board_post_comments DROP CONSTRAINT IF EXISTS board_post_comments_post_id_fkey;
ALTER TABLE board_post_comments ADD CONSTRAINT board_post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES board_posts(id) ON DELETE CASCADE;

-- board_post_comments.parent_id -> board_post_comments(id)
ALTER TABLE board_post_comments DROP CONSTRAINT IF EXISTS board_post_comments_parent_id_fkey;
ALTER TABLE board_post_comments ADD CONSTRAINT board_post_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES board_post_comments(id) ON DELETE CASCADE;

-- board_post_likes.post_id -> board_posts(id)
ALTER TABLE board_post_likes DROP CONSTRAINT IF EXISTS board_post_likes_post_id_fkey;
ALTER TABLE board_post_likes ADD CONSTRAINT board_post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES board_posts(id) ON DELETE CASCADE;

-- point_purchases.item_id -> shop_items(id)
ALTER TABLE point_purchases DROP CONSTRAINT IF EXISTS point_purchases_item_id_fkey;
ALTER TABLE point_purchases ADD CONSTRAINT point_purchases_item_id_fkey FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE;
