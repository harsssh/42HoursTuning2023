CALL DropIndexIfExists('user', 'idx_mail_password');
CREATE INDEX idx_mail_password ON `user` (`mail`, `password`);

CALL DropIndexIfExists('user', 'idx_entry_date_kana');
CREATE INDEX idx_entry_date_kana ON `user` (`entry_date`, `kana`);

CALL DropIndexIfExists('session', 'idx_linked_user_id');
CREATE INDEX idx_linked_user_id ON `session` (`linked_user_id`);

CALL DropIndexIfExists('match_group_member', 'idx_user_id_match_group_id');
CREATE INDEX idx_user_id_match_group_id ON `match_group_member` (`user_id`, `match_group_id`);

CALL DropIndexIfExists('match_group_member', 'idx_match_group_id');
CREATE INDEX idx_match_group_id ON `match_group_member` (`match_group_id`);

CALL DropIndexIfExists('department_role_member', 'idx_user_id');
CREATE INDEX idx_user_id ON `department_role_member` (`user_id`);

CALL DropIndexIfExists('department_role_member', 'idx_role_id');
CREATE INDEX idx_role_id ON `department_role_member` (`role_id`);

CALL DropIndexIfExists('user', 'idx_ngram_user_name');
ALTER TABLE `user` ADD FULLTEXT INDEX idx_ngram_user_name (`user_name`) WITH PARSER ngram;

CALL DropIndexIfExists('user', 'idx_ngram_kana');
ALTER TABLE `user` ADD FULLTEXT INDEX idx_ngram_kana (`kana`) WITH PARSER ngram;

CALL DropIndexIfExists('user', 'idx_ngram_mail');
ALTER TABLE `user` ADD FULLTEXT INDEX idx_ngram_mail (`mail`) WITH PARSER ngram;

CALL DropIndexIfExists('user', 'idx_ngram_goal');
ALTER TABLE `user` ADD FULLTEXT INDEX idx_ngram_goal (`goal`) WITH PARSER ngram;

CALL DropIndexIfExists('department', 'idx_ngram_department_name');
ALTER TABLE `department` ADD FULLTEXT INDEX idx_ngram_department_name (`department_name`) WITH PARSER ngram;

CALL DropIndexIfExists('role', 'idx_ngram_role_name');
ALTER TABLE `role` ADD FULLTEXT INDEX idx_ngram_role_name (`role_name`) WITH PARSER ngram;

CALL DropIndexIfExists('office', 'idx_ngram_office_name');
ALTER TABLE `office` ADD FULLTEXT INDEX idx_ngram_office_name (`office_name`) WITH PARSER ngram;

CALL DropIndexIfExists('skill', 'idx_ngram_skill_name');
ALTER TABLE `skill` ADD FULLTEXT INDEX idx_ngram_skill_name (`skill_name`) WITH PARSER ngram;

