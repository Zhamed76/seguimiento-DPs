# 📋 Tracker de Derechos de Petición

Sistema de seguimiento de plazos para derechos de petición y tutelas en Colombia, construido con HTML vanilla y Google Apps Script.

Desarrollado para uso personal por un abogado en Cali — pero si llegaste hasta aquí, bienvenido.

---

## ¿Qué hace?

Hace seguimiento automático de los plazos legales establecidos en el CPACA y el Decreto 2591/91:

- **15 días hábiles** para que la entidad responda el derecho de petición (art. 14 CPACA)
- Reinicio de plazo por **traslado por incompetencia** (art. 21 CPACA)
- Reinicio de plazo por **requerimiento de documentos** (art. 17 CPACA)
- **10 días calendario** para que el juez falle la tutela (art. 29 Dec. 2591/91)
- **3 días hábiles** para impugnar el fallo (art. 31 Dec. 2591/91)
- **20 días calendario** para que el juez ad quem falle en segunda instancia (art. 32 Dec. 2591/91)

Descuenta sábados, domingos y festivos colombianos (calendario 2025–2026).

---

## Características

- Alertas visuales por colores: morado (normal) → amarillo (por vencer) → rojo (vencido / tutela procedente)
- Estados procesales: sin respuesta, trasladada, requiere documentos, respondida, tutela interpuesta, tutela resuelta
- Edición de radicados sin necesidad de eliminar y volver a crear
- Campo de notas por radicado
- Exportar backup en `.json` e importar para restaurar datos
- Sincronización automática con Google Apps Script via webhook
- Notificaciones por correo a las 8 AM cuando algo vence (requiere configuración de Apps Script)

---

## Tecnologías

- HTML + CSS + JavaScript vanilla (sin dependencias)
- `localStorage` para persistencia local
- Google Apps Script como backend (webhook + notificador diario)
- `PropertiesService` de Google como almacenamiento del lado del servidor

---

## Uso

### Opción A — Directo en el navegador (sin notificaciones)

Abre `index.html` directamente. Funciona para consulta pero el webhook no puede enviar datos desde `file://`.

### Opción B — Servidor local (con notificaciones)

```bash
# En la carpeta del proyecto
python -m http.server 8000
```

Luego abre `http://localhost:8000` en el navegador.

### Opción C — GitHub Pages (recomendado)

Accede desde cualquier dispositivo en:

```
https://[tu-usuario].github.io/[nombre-repositorio]
```

---

## Configuración del webhook (notificaciones por correo)

1. Abre [script.google.com](https://script.google.com) y crea un proyecto nuevo
2. Pega el contenido de `tracker_webhook_v2.gs`
3. Cambia `CORREO_DESTINO` por tu correo
4. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: Yo
   - Quién tiene acceso: Cualquier usuario
5. Copia la URL generada y pégala en el campo ⚙ del tracker
6. Configura el trigger diario:
   - Ícono de reloj en Apps Script → Agregar activador
   - Función: `notificarVencimientos`
   - Basado en tiempo → Día → Entre 8:00 y 9:00

---

## Backup y restauración

- **↓ backup** — descarga un `.json` con todos los datos. Recomendado guardarlo en Google Drive después de cada cambio importante.
- **↑ restaurar** — carga un `.json` previamente exportado. Los plazos se recalculan automáticamente desde las fechas guardadas.

La URL del webhook y la configuración se guardan por separado en `localStorage` y no se ven afectadas por importar o exportar.

---

## Normativa de referencia

| Norma | Artículo | Plazo |
|---|---|---|
| Ley 1437/2011 (CPACA) | Art. 14 | 15 días hábiles para responder DP |
| Ley 1437/2011 (CPACA) | Art. 17 | Desistimiento tácito por docs. no aportados |
| Ley 1437/2011 (CPACA) | Art. 21 | Traslado por incompetencia — reinicia plazo |
| Decreto 2591/1991 | Art. 29 | 10 días calendario para fallo de tutela |
| Decreto 2591/1991 | Art. 31 | 3 días hábiles para impugnar |
| Decreto 2591/1991 | Art. 32 | 20 días calendario para fallo 2ª instancia |

---

## Licencia

Sin licencia formal. Uso libre. Si le sirve a alguien más, qué bueno.
