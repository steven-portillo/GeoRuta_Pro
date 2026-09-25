export interface ColumnaDef {
    campo?: string;
    titulo: string;
    tipo?: "texto" | "acciones" | "estado" | "imagen"|"estado-editable";
    acciones?: string[];
    opcionesEstado?: string[];
}