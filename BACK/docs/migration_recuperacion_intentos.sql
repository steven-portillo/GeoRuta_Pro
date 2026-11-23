-- Migración de seguridad: Límite de intentos en códigos de recuperación de contraseña
-- Ejecuta este comando en la base de datos 'georuta':

ALTER TABLE recuperacion_password 
  ADD COLUMN intentos INT DEFAULT 0,
  ADD COLUMN bloqueado TINYINT(1) DEFAULT 0;

