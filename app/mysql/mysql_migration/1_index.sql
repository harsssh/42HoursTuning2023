CALL DropIndexIfExists('user', 'idx_mail_password');
CREATE INDEX idx_mail_password ON user (`mail`, `password`);

CALL DropIndexIfExists('user', 'idx_entry_date_kana');
CREATE INDEX idx_entry_date_kana ON user (`entry_date`, `kana`);

CALL DropIndexIfExists('session', 'idx_linked_user_id');
CREATE INDEX idx_linked_user_id ON session (`linked_user_id`);

ALTER TABLE `user` ADD FULLTEXT INDEX idx_ngram_user_name (`user_name`) WITH PARSER ngram;
ALTER TABLE `user` ADD FULLTEXT INDEX idx_ngram_kana (`kana`) WITH PARSER ngram;
ALTER TABLE `user` ADD FULLTEXT INDEX idx_ngram_mail (`mail`) WITH PARSER ngram;
ALTER TABLE `user` ADD FULLTEXT INDEX idx_ngram_goal (`goal`) WITH PARSER ngram;
ALTER TABLE `department` ADD FULLTEXT INDEX idx_ngram_department_name (`department_name`) WITH PARSER ngram;
ALTER TABLE `role` ADD FULLTEXT INDEX idx_ngram_role_name (`role_name`) WITH PARSER ngram;
ALTER TABLE `office` ADD FULLTEXT INDEX idx_ngram_office_name (`office_name`) WITH PARSER ngram;
ALTER TABLE `skill` ADD FULLTEXT INDEX idx_ngram_skill_name (`skill_name`) WITH PARSER ngram;

