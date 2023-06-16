CALL DropIndexIfExists('user', 'idx_mail_password');
CREATE INDEX idx_mail_password ON user (`mail`, `password`);

CALL DropIndexIfExists('user', 'idx_office_id');
CREATE INDEX idx_linked_user_id ON session (`linked_user_id`);
