// ============================================================
// TRACKER DP — Webhook + Notificador diario
// Versión 2: usa Properties Service (sin Sheets)
// ============================================================
//
// INSTRUCCIONES:
// 1. Reemplaza TODO el código anterior con este
// 2. Cambia CORREO_DESTINO abajo
// 3. Guarda (Ctrl+S)
// 4. Implementar → Administrar implementaciones → lápiz
//    → Nueva versión → Implementar
//    (la URL queda igual si ya la tenías)
// 5. El trigger diario ya está configurado — no tocar
// ============================================================

const CORREO_DESTINO = "tu.correo@gmail.com"; // ← CAMBIA ESTO
const DIAS_AVISO = 2;

// ── FESTIVOS CO 2025-2026 ──────────────────────────────────
const FESTIVOS = new Set([
  "2025-01-01","2025-01-06","2025-03-24","2025-04-17","2025-04-18",
  "2025-05-01","2025-06-02","2025-06-23","2025-06-30","2025-07-20",
  "2025-08-07","2025-08-18","2025-10-13","2025-11-03","2025-11-17",
  "2025-12-08","2025-12-25",
  "2026-01-01","2026-01-12","2026-03-23","2026-04-02","2026-04-03",
  "2026-05-01","2026-05-18","2026-06-08","2026-06-15","2026-07-20",
  "2026-08-07","2026-08-17","2026-10-12","2026-11-02","2026-11-16",
  "2026-12-08","2026-12-25"
]);

function esHabil(f) {
  if (!f || !(f instanceof Date) || isNaN(f)) return false;
  const d = f.getDay();
  if (d === 0 || d === 6) return false;
  return !FESTIVOS.has(Utilities.formatDate(f, "America/Bogota", "yyyy-MM-dd"));
}

function sumarDH(fechaStr, n) {
  const d = new Date(fechaStr);
  let c = 0;
  while (c < n) { d.setDate(d.getDate() + 1); if (esHabil(d)) c++; }
  return d;
}

function dhTranscurridos(fechaStr) {
  const ini = new Date(fechaStr); ini.setHours(0,0,0,0);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  let c = 0;
  const cur = new Date(ini); cur.setDate(cur.getDate() + 1);
  while (cur <= hoy) { if (esHabil(cur)) c++; cur.setDate(cur.getDate() + 1); }
  return c;
}

function dcTranscurridos(fechaStr) {
  const a = new Date(fechaStr); a.setHours(0,0,0,0);
  const b = new Date(); b.setHours(0,0,0,0);
  return Math.max(0, Math.round((b - a) / 86400000));
}

function addDias(fechaStr, n) {
  const d = new Date(fechaStr); d.setDate(d.getDate() + n); return d;
}

function fmt(d) {
  return Utilities.formatDate(new Date(d), "America/Bogota", "dd/MM/yyyy");
}

// ── WEBHOOK: recibe datos del artefacto ───────────────────
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    const peticiones = datos.peticiones || [];
    const props = PropertiesService.getScriptProperties();
    props.setProperty('peticiones', JSON.stringify(peticiones));
    props.setProperty('ultima_sync', new Date().toISOString());
    Logger.log("Sincronizadas " + peticiones.length + " peticiones.");
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, sincronizadas: peticiones.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    Logger.log("Error en doPost: " + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const ultima = props.getProperty('ultima_sync') || 'nunca';
  const raw = props.getProperty('peticiones');
  const peticiones = raw ? JSON.parse(raw) : [];
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, peticiones: peticiones, n: peticiones.length, ultima_sync: ultima }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── NOTIFICADOR DIARIO (trigger 8 AM) ────────────────────
function notificarVencimientos() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('peticiones');
  if (!raw) { Logger.log("Sin datos aún."); return; }

  const peticiones = JSON.parse(raw);
  if (peticiones.length === 0) { Logger.log("Lista vacía."); return; }

  const alertas = [];
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  peticiones.forEach(p => {
    const entidad  = p.entidad || "";
    const radicado = p.radicado || "";
    const asunto   = p.asunto || "";
    const estado   = (p.estado || "").toLowerCase();
    if (!entidad || !p.fecha) return;

    // 1. Derecho de petición — 15 días hábiles (solo registros tipo DP)
    const estadosVivos = ["sin_respuesta","trasladada","requiere_docs"];
    if (estadosVivos.includes(estado)) {
      let fechaBase = p.fecha;
      let labelBase = "radicación original";

      if (estado === "trasladada" && p.traslado && p.traslado.fechaRecepcion) {
        fechaBase = p.traslado.fechaRecepcion;
        labelBase = "recepción tras traslado (art.21 CPACA)";
      } else if (estado === "requiere_docs" && p.docs && p.docs.env) {
        fechaBase = p.docs.env;
        labelBase = "envío de documentos";
      }

      const dh = dhTranscurridos(fechaBase);
      const fVenc = sumarDH(fechaBase, 15);
      const diasHasta = Math.round((fVenc - hoy) / 86400000);

      if (dh >= 15) {
        alertas.push({ nivel: "VENCIDO", entidad, radicado, asunto,
          msg: `DP vencido hace ${dh - 15} d.h. desde ${labelBase}. Venció: ${fmt(fVenc)}. TUTELA PROCEDENTE.` });
      } else if (diasHasta <= DIAS_AVISO) {
        alertas.push({ nivel: "POR VENCER", entidad, radicado, asunto,
          msg: `DP vence en ${Math.max(0, 15 - dh)} día(s) hábil(es) — ${fmt(fVenc)}. Base: ${labelBase}.` });
      }
    }

    // 2. Tutela — 10 días hábiles (aplica tanto a DP+tutela como tutela independiente)
    if (estado === "tutela_interpuesta" && p.tutela && p.tutela.fechaInterposicion) {
      const dh = dhTranscurridos(p.tutela.fechaInterposicion);
      const fV = sumarDH(p.tutela.fechaInterposicion, 10);
      const diasHasta = Math.round((fV - hoy) / 86400000);
      if (dh >= 10) {
        alertas.push({ nivel: "VENCIDO", entidad, radicado, asunto,
          msg: `Plazo juez tutela vencido (art.29 Dec.2591). ${dh} d.h. desde ${fmt(new Date(p.tutela.fechaInterposicion))}. Venció: ${fmt(fV)}.` });
      } else if (diasHasta <= DIAS_AVISO) {
        alertas.push({ nivel: "POR VENCER", entidad, radicado, asunto,
          msg: `Fallo tutela vence en ${Math.max(0, 10 - dh)} día(s) háb. — ${fmt(fV)} (art.29 Dec.2591).` });
      }
    }

    // 3. Impugnación — 20 días hábiles
    if (p.tutela && p.tutela.fechaImpugnacion) {
      const dh = dhTranscurridos(p.tutela.fechaImpugnacion);
      const fV = sumarDH(p.tutela.fechaImpugnacion, 20);
      const diasHasta = Math.round((fV - hoy) / 86400000);
      if (dh >= 20) {
        alertas.push({ nivel: "VENCIDO", entidad, radicado, asunto,
          msg: `Plazo juez ad quem vencido (art.32 Dec.2591). ${dh} d.h. desde impugnación del ${fmt(new Date(p.tutela.fechaImpugnacion))}. Venció: ${fmt(fV)}.` });
      } else if (diasHasta <= DIAS_AVISO) {
        alertas.push({ nivel: "POR VENCER", entidad, radicado, asunto,
          msg: `Fallo 2ª instancia vence en ${Math.max(0, 20 - dh)} día(s) háb. — ${fmt(fV)} (art.32 Dec.2591).` });
      }
    }
  });

  if (alertas.length === 0) { Logger.log("Sin alertas hoy."); return; }

  const hoyStr = fmt(hoy);
  let html = `<div style="font-family:monospace;background:#0a0a0f;color:#e2e2f0;padding:24px;border-radius:8px;max-width:680px;">`;
  html += `<h2 style="color:#a78bfa;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">// tracker derechos de petición · tutelas</h2>`;
  html += `<p style="color:#7878a8;font-size:13px;margin:0 0 20px;">Informe automático · ${hoyStr}</p>`;
  html += `<p style="margin:0 0 16px;"><strong style="color:#f87171;">${alertas.length}</strong> alerta(s) requieren atención:</p>`;

  alertas.forEach(a => {
    const esVenc = a.nivel === "VENCIDO";
    const col  = esVenc ? "#f87171" : "#fbbf24";
    const bg   = esVenc ? "rgba(220,38,38,.12)" : "rgba(217,119,6,.12)";
    const bord = esVenc ? "rgba(220,38,38,.4)"  : "rgba(217,119,6,.4)";
    html += `<div style="background:${bg};border:.5px solid ${bord};border-radius:6px;padding:14px;margin-bottom:10px;">`;
    html += `<div style="color:${col};font-size:12px;font-weight:bold;letter-spacing:1px;margin-bottom:6px;">${esVenc ? '🔴 VENCIDO' : '🟡 POR VENCER'}</div>`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:3px;">${a.entidad}</div>`;
    if (a.radicado) html += `<div style="color:#7878a8;font-size:13px;margin-bottom:3px;">${a.radicado}</div>`;
    if (a.asunto)   html += `<div style="color:#7878a8;font-size:13px;margin-bottom:8px;">${a.asunto}</div>`;
    html += `<div style="color:#c4b5fd;font-size:14px;">${a.msg}</div></div>`;
  });

  html += `<p style="color:#555;font-size:12px;margin-top:20px;">Generado automáticamente · art.14,21 CPACA · Dec.2591/91</p></div>`;

  MailApp.sendEmail({
    to: CORREO_DESTINO,
    subject: `[DP Tracker] ${alertas.length} alerta(s) · ${hoyStr}`,
    htmlBody: html
  });

  Logger.log("Correo enviado con " + alertas.length + " alertas.");
}
