UPDATE usuarios
SET password_hash = '$2a$10$QyAtxJG6fsGJLuBxH56lzOqtErOn3NUosQS0DRtw0a3RSU4P3/7gG'
WHERE email IN (
  'cocacola@gmail.com',
  'postobon@gmail.com',
  'pollos.eldorado@gmail.com',
  'alqueria@gmail.com'
)
AND password_hash = '$2a$10$zNT7xUJY2rmlH7PS2TC9Dewlku42zYhJ9S3DWyTUP51f6EHkote0u';
