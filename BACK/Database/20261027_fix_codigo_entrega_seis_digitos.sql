ALTER TABLE `asignacion_pedido`
  MODIFY COLUMN `codigo_entrega` char(6) DEFAULT NULL;

UPDATE `asignacion_pedido`
SET `codigo_entrega` = LPAD(TRIM(`codigo_entrega`), 6, '0')
WHERE `codigo_entrega` IS NOT NULL
  AND CHAR_LENGTH(TRIM(`codigo_entrega`)) BETWEEN 1 AND 5;