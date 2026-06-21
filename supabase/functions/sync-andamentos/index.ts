// ════════════════════════════════════════════════════════════════════
//  sync-andamentos — puxa movimentações do DataJud (API Pública do CNJ)
//  e grava como andamentos do caso (sem duplicar). Fase 1: sob demanda.
// ════════════════════════════════════════════════════════════════════
import { createClient } from "jsr:@supabase/supabase-js@2";

const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";
// Chave PÚBLICA do DataJud, divulgada pelo CNJ (https://datajud-wiki.cnj.jus.br/api-publica/acesso).
// Pode ser sobrescrita pelo secret DATAJUD_APIKEY caso o CNJ a altere.
const DATAJUD_PUBLIC_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Mapa TR (código do tribunal) → UF, para a Justiça Estadual (J=8) ──
const UF_ESTADUAL: Record<string, string> = {
  "01": "ac", "02": "al", "03": "ap", "04": "am", "05": "ba", "06": "ce",
  "07": "df", "08": "es", "09": "go", "10": "ma", "11": "mt", "12": "ms",
  "13": "mg", "14": "pa", "15": "pb", "16": "pr", "17": "pe", "18": "pi",
  "19": "rj", "20": "rn", "21": "rs", "22": "ro", "23": "rr", "24": "sc",
  "25": "se", "26": "sp", "27": "to",
};

// Deriva o alias do índice DataJud a partir do número CNJ (20 dígitos).
// Formato: NNNNNNN DD AAAA J TR OOOO
function aliasDataJud(num20: string): string | null {
  if (num20.length !== 20) return null;
  const j = num20[13];               // segmento do judiciário
  const tr = num20.slice(14, 16);    // código do tribunal
  const trN = parseInt(tr, 10);
  switch (j) {
    case "3": return "stj";
    case "4": return trN >= 1 && trN <= 6 ? `trf${trN}` : null;  // Justiça Federal
    case "5": return tr === "00" ? "tst" : `trt${trN}`;          // Justiça do Trabalho
    case "8": return UF_ESTADUAL[tr] ? `tj${UF_ESTADUAL[tr]}` : null; // Estadual
    case "7": return "stm";
    default:  return null; // STF/eleitoral/militar estadual: não suportados nesta fase
  }
}

function descMovimento(m: any): string {
  let d = String(m?.nome ?? "Movimento").trim();
  const comps = Array.isArray(m?.complementosTabelados) ? m.complementosTabelados : [];
  const extras = comps.map((c: any) => c?.nome).filter(Boolean);
  if (extras.length) d += " — " + extras.join(", ");
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const apiKey = Deno.env.get("DATAJUD_APIKEY") || DATAJUD_PUBLIC_KEY;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Não autenticado." }, 401);

  let caso_id: string | undefined;
  try { caso_id = (await req.json())?.caso_id; } catch { /* ignore */ }
  if (!caso_id) return json({ error: "Informe o caso_id." }, 400);

  // Client com o JWT do usuário → respeita RLS (office members)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // 1) Carrega o caso (RLS garante que pertence ao office do usuário)
  const { data: caso, error: eCaso } = await supabase
    .from("casos")
    .select("id, office_id, numero_processo")
    .eq("id", caso_id)
    .single();
  if (eCaso || !caso) return json({ error: "Caso não encontrado." }, 404);

  const num20 = String(caso.numero_processo ?? "").replace(/\D/g, "");
  if (num20.length !== 20) {
    return json({ error: "Cadastre o nº do processo (formato CNJ) para sincronizar." }, 422);
  }

  const alias = aliasDataJud(num20);
  if (!alias) {
    return json({ error: "Tribunal deste processo ainda não é suportado na sincronização automática." }, 422);
  }

  // 2) Consulta o DataJud
  let hits: any[] = [];
  try {
    const resp = await fetch(`${DATAJUD_BASE}/api_publica_${alias}/_search`, {
      method: "POST",
      headers: { "Authorization": `APIKey ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ size: 10, query: { match: { numeroProcesso: num20 } } }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("DataJud HTTP", resp.status, t.slice(0, 300));
      return json({ error: `Falha ao consultar o DataJud (HTTP ${resp.status}).` }, 502);
    }
    const data = await resp.json();
    hits = data?.hits?.hits ?? [];
  } catch (err) {
    console.error("DataJud fetch", err);
    return json({ error: "Não foi possível contatar o DataJud." }, 502);
  }

  if (hits.length === 0) {
    return json({ novos: 0, total: 0, aviso: "Processo não localizado no DataJud (pode haver latência ou segredo de justiça)." });
  }

  // 3) Monta os andamentos a partir dos movimentos (todos os graus)
  type Linha = { fonte_id: string; data: string; descricao: string };
  const linhas: Linha[] = [];
  const vistos = new Set<string>();
  for (const h of hits) {
    const src = h?._source ?? {};
    const grau = String(src.grau ?? "G");
    const movs = Array.isArray(src.movimentos) ? src.movimentos : [];
    movs.forEach((m: any, i: number) => {
      const dh = m?.dataHora ? String(m.dataHora) : "";
      const fonte_id = `datajud:${grau}:${m?.codigo ?? "x"}:${dh || i}`;
      if (vistos.has(fonte_id)) return;
      vistos.add(fonte_id);
      linhas.push({
        fonte_id,
        data: (dh || src.dataHoraUltimaAtualizacao || new Date().toISOString()).slice(0, 10),
        descricao: descMovimento(m),
      });
    });
  }

  // 4) Descobre quais já existem (dedup pelo índice único caso_id+fonte_id)
  const { data: existentes } = await supabase
    .from("andamentos")
    .select("fonte_id")
    .eq("caso_id", caso.id)
    .not("fonte_id", "is", null);
  const jaExiste = new Set((existentes ?? []).map((r: any) => r.fonte_id));

  const novas = linhas
    .filter((l) => !jaExiste.has(l.fonte_id))
    .map((l) => ({
      office_id: caso.office_id,
      caso_id: caso.id,
      data: l.data,
      descricao: l.descricao,
      fonte: "datajud",
      fonte_id: l.fonte_id,
    }));

  if (novas.length > 0) {
    const { error: eIns } = await supabase
      .from("andamentos")
      .upsert(novas, { onConflict: "caso_id,fonte_id", ignoreDuplicates: true });
    if (eIns) {
      console.error("insert andamentos", eIns);
      return json({ error: "Erro ao gravar andamentos." }, 500);
    }
  }

  // 5) Marca a última sincronização
  await supabase
    .from("casos")
    .update({ ultima_sincronizacao: new Date().toISOString() })
    .eq("id", caso.id);

  return json({ novos: novas.length, total: linhas.length });
});
