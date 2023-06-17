CALL DropIndexIfExists('user', 'idx_mail_password');
CREATE INDEX idx_mail_password ON user (`mail`, `password`);

CALL DropIndexIfExists('user', 'idx_office_id');
CREATE INDEX idx_linked_user_id ON session (`linked_user_id`);

ALTER TABLE user ADD FULLTEXT INDEX idx_ngram_user_name (user_name) WITH PARSER ngram;

ALTER TABLE user ADD FULLTEXT INDEX idx_ngram_kana (kana) WITH PARSER kana;

ALTER TABLE user ADD FULLTEXT INDEX idx_ngram_mail (mail) WITH PARSER mail;

ALTER TABLE user ADD FULLTEXT INDEX idx_ngram_departmentName (departmentName) WITH PARSER departmentName;

ALTER TABLE user ADD FULLTEXT INDEX idx_ngram_department_id (department_id) WITH PARSER department_id;
