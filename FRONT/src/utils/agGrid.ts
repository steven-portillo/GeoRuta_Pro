export interface ColumnaDef {
    campo?: string;
    titulo: string;
    tipo?: "texto" | "acciones" | "estado" | "imagen"|"estado-editable" | "moneda" | "fecha" | "estado-pedido";
    acciones?: string[];
    defaultImg?: string;
    opcionesEstado?: string[];
}