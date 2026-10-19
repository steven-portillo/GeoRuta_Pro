/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    usuario: {
      idUsuario: number;
      idEmpresa: number | null;
      rol: string;
    };
  }
}