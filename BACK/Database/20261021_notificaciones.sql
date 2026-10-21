CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id_notificacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `tipo` varchar(50) NOT NULL,
  `mensaje` text NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `IDX_NOTIFICACIONES_usuario_fecha` (`id_usuario`, `fecha_hora`),
  KEY `IDX_NOTIFICACIONES_pedido` (`id_pedido`),
  CONSTRAINT `FK_NOTIFICACIONES_usuario`
    FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_NOTIFICACIONES_pedido`
    FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`)
    ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
