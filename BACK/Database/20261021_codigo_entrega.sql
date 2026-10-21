ALTER TABLE `pedidos`
  ADD COLUMN `codigo_entrega` char(6) DEFAULT NULL,
  ADD COLUMN `intentos_codigo` tinyint unsigned NOT NULL DEFAULT 0;
