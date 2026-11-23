ALTER TABLE `asignacion_pedido`
  MODIFY COLUMN `codigo_entrega` char(6) DEFAULT NULL;

ALTER TABLE `asignacion_pedido`
  ADD COLUMN `intentos_codigo` tinyint unsigned NOT NULL DEFAULT 0
  AFTER `codigo_entrega`;

UPDATE `asignacion_pedido` ap
INNER JOIN `pedidos` p ON p.`id_pedido` = ap.`id_pedido`
SET ap.`codigo_entrega` = LPAD(
      TRIM(COALESCE(ap.`codigo_entrega`, p.`codigo_entrega`)),
      6,
      '0'
    ),
    ap.`intentos_codigo` = p.`intentos_codigo`;

ALTER TABLE `pedidos`
  DROP COLUMN `codigo_entrega`,
  DROP COLUMN `intentos_codigo`;
