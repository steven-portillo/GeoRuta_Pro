-- Ejecutar una sola vez en una base que aun no tenga estas columnas y tablas.
ALTER TABLE `direcciones`
  ADD COLUMN `alias` varchar(100) DEFAULT NULL AFTER `id_usuario`;

CREATE TABLE `carritos` (
  `id_carrito` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `id_empresa` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_carrito`),
  UNIQUE KEY `UQ_CARRITOS_cliente` (`id_cliente`),
  KEY `FK_CARRITOS_empresa` (`id_empresa`),
  CONSTRAINT `FK_CARRITOS_cliente`
    FOREIGN KEY (`id_cliente`) REFERENCES `usuarios` (`id_usuario`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_CARRITOS_empresa`
    FOREIGN KEY (`id_empresa`) REFERENCES `empresas` (`id_empresa`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `carrito_items` (
  `id_carrito_item` int(11) NOT NULL AUTO_INCREMENT,
  `id_carrito` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  PRIMARY KEY (`id_carrito_item`),
  UNIQUE KEY `UQ_CARRITO_ITEMS_carrito_producto` (`id_carrito`, `id_producto`),
  KEY `FK_CARRITO_ITEMS_producto` (`id_producto`),
  CONSTRAINT `FK_CARRITO_ITEMS_carrito`
    FOREIGN KEY (`id_carrito`) REFERENCES `carritos` (`id_carrito`)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `FK_CARRITO_ITEMS_producto`
    FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `CHK_CARRITO_ITEMS_cantidad` CHECK (`cantidad` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
