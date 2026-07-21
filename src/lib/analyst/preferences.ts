export const analystPreferencesChangedEvent = "nube-copilot:analyst-preferences-changed";

export type AnalystPreferences = {
  cadence: string;
  category: string;
  completedAt?: string;
  friction: string;
  goal: string;
  role: string;
  stage: string;
  tone: string;
  volume: string;
};

export const defaultAnalystPreferences: AnalystPreferences = {
  cadence: "Semanal",
  category: "Indumentaria",
  friction: "Saber qué reponer",
  goal: "Reducir inventario lento",
  role: "Dueño/a",
  stage: "Creciendo",
  tone: "Detallado",
  volume: "A detectar",
};

export const preferenceOptions = {
  cadences: ["Diario", "Semanal", "Mensual"],
  categories: ["Indumentaria", "Belleza", "Hogar", "Electrónica", "Alimentos", "Salud", "Deportes", "Otro"],
  frictions: [
    "Saber qué reponer",
    "Entender por qué cambian las ventas",
    "Encontrar productos que no se mueven",
    "Preparar reportes",
    "Decidir qué promocionar",
  ],
  goals: [
    "Aumentar ingresos",
    "Evitar quiebres de stock",
    "Entender productos estrella",
    "Mejorar recompra",
    "Reducir inventario lento",
  ],
  roles: ["Dueño/a", "Manager", "Marketing", "Operaciones", "Otro"],
  stages: ["Empezando", "Creciendo", "Establecida"],
  tones: ["Directo", "Detallado", "Accionable"],
};

export async function loadAnalystPreferences(storeId?: string): Promise<AnalystPreferences> {
  const response = await fetch(storeId ? `/api/analyst/preferences?storeId=${encodeURIComponent(storeId)}` : "/api/analyst/preferences", {
    cache: "no-store",
  });

  if (!response.ok) {
    return defaultAnalystPreferences;
  }

  const payload = (await response.json()) as {
    ok: boolean;
    preferences?: AnalystPreferences;
  };

  return payload.ok && payload.preferences ? payload.preferences : defaultAnalystPreferences;
}

export async function saveAnalystPreferences(preferences: AnalystPreferences, storeId?: string) {
  const response = await fetch(storeId ? `/api/analyst/preferences?storeId=${encodeURIComponent(storeId)}` : "/api/analyst/preferences", {
    body: JSON.stringify(preferences),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "No se pudieron guardar las preferencias.");
  }

  const payload = (await response.json()) as {
    ok: true;
    preferences: AnalystPreferences;
  };

  window.dispatchEvent(new Event(analystPreferencesChangedEvent));
  return payload.preferences;
}

export function subscribeToAnalystPreferences(onChange: () => void) {
  window.addEventListener(analystPreferencesChangedEvent, onChange);

  return () => {
    window.removeEventListener(analystPreferencesChangedEvent, onChange);
  };
}

export function getPreferenceSummary(preferences: AnalystPreferences) {
  return `${preferences.goal}, con prioridad en ${preferences.friction.toLowerCase()}.`;
}

export function getPersonalizedPrompts(preferences: AnalystPreferences) {
  void preferences;

  return [
    "¿Cuáles fueron los 5 productos más vendidos en los últimos 30 días?",
    "¿Qué productos necesito reponer primero?",
    "¿Qué productos no se vendieron en los últimos 30 días?",
  ];
}
