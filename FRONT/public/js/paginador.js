// public/js/paginador.js
// paginador reutilizable para todas las tablas de los paneles.
// expone dos funciones globales:
//   crearPaginador({ contenedor, porPagina, alCambiar })  -> para tablas que se pintan con js
//   paginarTabla({ tbody, contenedor, porPagina })        -> para tablas con filas ya renderizadas (ssr)

(function () {
  // si el archivo se carga dos veces no se vuelve a definir nada
  if (window.crearPaginador) return;

  // estilos propios, inyectados una sola vez, asi no hay que tocar los css de cada panel.
  // el color se puede cambiar por contenedor con la variable --pag-color
  var estilo = document.createElement('style');
  estilo.textContent =
    '.paginador{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:.75rem 1rem;border-top:1px solid var(--gris-100,#f1f5f9)}' +
    '.paginador-info{font-size:.78rem;color:var(--gris-500,#64748b)}' +
    '.paginador-botones{display:flex;align-items:center;gap:4px;flex-wrap:wrap}' +
    '.paginador button{min-width:32px;height:32px;padding:0 10px;border:1px solid var(--gris-200,#e2e8f0);background:#fff;color:var(--gris-700,#334155);border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer}' +
    '.paginador button:hover:not(:disabled):not(.activa){background:var(--gris-50,#f8fafc)}' +
    '.paginador button.activa{background:var(--pag-color,var(--azul-600,#2563eb));border-color:var(--pag-color,var(--azul-600,#2563eb));color:#fff;cursor:default}' +
    '.paginador button:disabled{opacity:.45;cursor:not-allowed}' +
    '.paginador-puntos{padding:0 4px;color:#94a3b8}';
  document.head.appendChild(estilo);

  window.crearPaginador = function (opciones) {
    var contenedor =
      typeof opciones.contenedor === 'string' ? document.getElementById(opciones.contenedor) : opciones.contenedor;
    var porPagina = opciones.porPagina || 5;
    var alCambiar = opciones.alCambiar || function () {};
    var pagina = 1;
    var totalPaginas = 1;

    // numeros a mostrar: primera, ultima y la actual con sus vecinas; el resto se resume en "..."
    function numeros() {
      var lista = [];
      for (var n = 1; n <= totalPaginas; n++) {
        if (n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1) {
          lista.push(n);
        } else if (lista[lista.length - 1] !== '...') {
          lista.push('...');
        }
      }
      return lista;
    }

    function dibujar(total, desde, hasta) {
      if (!contenedor) return;

      // con una sola pagina no hace falta mostrar controles
      if (total <= porPagina) {
        contenedor.innerHTML = '';
        return;
      }

      var botones =
        '<button type="button" data-pag="ant"' + (pagina === 1 ? ' disabled' : '') + '>‹ Anterior</button>';

      numeros().forEach(function (n) {
        if (n === '...') {
          botones += '<span class="paginador-puntos">…</span>';
        } else {
          botones +=
            '<button type="button" data-pag="' + n + '"' + (n === pagina ? ' class="activa"' : '') + '>' + n + '</button>';
        }
      });

      botones +=
        '<button type="button" data-pag="sig"' + (pagina === totalPaginas ? ' disabled' : '') + '>Siguiente ›</button>';

      contenedor.innerHTML =
        '<div class="paginador">' +
        '<span class="paginador-info">Mostrando ' + (desde + 1) + '–' + hasta + ' de ' + total + '</span>' +
        '<div class="paginador-botones">' + botones + '</div>' +
        '</div>';
    }

    // un solo listener por contenedor (delegacion), porque los botones se redibujan cada vez
    if (contenedor) {
      contenedor.addEventListener('click', function (evento) {
        var boton = evento.target.closest('button[data-pag]');
        if (!boton || boton.disabled) return;

        var destino = boton.getAttribute('data-pag');
        if (destino === 'ant') pagina = pagina - 1;
        else if (destino === 'sig') pagina = pagina + 1;
        else pagina = Number(destino);

        alCambiar();
      });
    }

    return {
      // vuelve a la pagina 1 (usar cuando cambia una busqueda o un filtro)
      irAPrimera: function () {
        pagina = 1;
      },
      // recibe cuantas filas hay en total (ya filtradas), dibuja los controles
      // y devuelve el rango a mostrar: lista.slice(desde, hasta)
      rango: function (total) {
        totalPaginas = Math.max(1, Math.ceil(total / porPagina));
        if (pagina > totalPaginas) pagina = totalPaginas;
        if (pagina < 1) pagina = 1;

        var desde = (pagina - 1) * porPagina;
        var hasta = Math.min(desde + porPagina, total);
        dibujar(total, desde, hasta);
        return { desde: desde, hasta: hasta };
      },
    };
  };

  // para tablas cuyas filas ya vienen en el html: oculta las que no son de la pagina actual
  window.paginarTabla = function (opciones) {
    var tbody = opciones.tbody;
    if (!tbody) return;

    var filas = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    var paginador = window.crearPaginador({
      contenedor: opciones.contenedor,
      porPagina: opciones.porPagina || 5,
      alCambiar: pintar,
    });

    function pintar() {
      var r = paginador.rango(filas.length);
      filas.forEach(function (fila, i) {
        fila.style.display = i >= r.desde && i < r.hasta ? '' : 'none';
      });
    }

    pintar();
  };
})();