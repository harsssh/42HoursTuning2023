CALL CALL DropIndexIfExists('user', 'idx_mail_password');
CREATE INDEX idx_mail_password ON user (`mail`, `password`);