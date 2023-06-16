DROP INDEX idx_mail_password ON user;
CREATE INDEX idx_mail_password ON user (`mail`, `password`);
