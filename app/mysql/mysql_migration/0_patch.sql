ALTER TABLE user ADD COLUMN reversed_user_name VARCHAR(50);
UPDATE user SET reversed_user_name = REVERSE(user_name);
