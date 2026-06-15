export const analystPreferencesChangedEvent = "nube-copilot:analyst-preferences-changed";

export type AnalystPreferences = {
  cadence: string;
  category: string;
  completedAt?: string;
  friction: string;
  goal: string;
  name: string;
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
  name: "",
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

export async function loadAnalystPreferences(): Promise<AnalystPreferences> {
  const response = await fetch("/api/analyst/preferences", { cache: "no-store" });

  if (!response.ok) {
    return defaultAnalystPreferences;
  }

  const payload = (await response.json()) as {
    ok: boolean;
    preferences?: AnalystPreferences;
  };

  return payload.ok && payload.preferences ? payload.preferences : defaultAnalystPreferences;
}

export async function saveAnalystPreferences(preferences: AnalystPreferences) {
  const response = await fetch("/api/analyst/preferences", {
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
  const normalizedGoal = preferences.goal.toLowerCase();
  const normalizedFriction = preferences.friction.toLowerCase();

  if (normalizedGoal.includes("ingresos")) {
    return [
      "¿Qué productos explican el crecimiento de ingresos esta semana?",
      "¿Qué canal o categoría debería priorizar para vender más?",
      "¿Dónde cayó el ticket promedio y qué puedo hacer?",
    ];
  }

  if (normalizedGoal.includes("stock") || normalizedFriction.includes("reponer")) {
    return [
      "¿Qué productos tengo que reponer primero?",
      "¿Qué variantes están en riesgo de quiebre de stock?",
      "¿Qué productos puedo promocionar sin comprometer inventario?",
    ];
  }

  if (normalizedGoal.includes("recompra")) {
    return [
      "¿Qué señales muestran clientes con potencial de recompra?",
      "¿Qué productos podrían funcionar para una campaña de recompra?",
      "¿Qué cambió en los pedidos de clientes recurrentes?",
    ];
  }

  if (normalizedGoal.includes("inventario lento") || normalizedFriction.includes("no se mueven")) {
    return [
      "¿Qué productos no se vendieron en los últimos 30 días?",
      "¿Qué debería poner en promoción para liberar stock?",
      "¿Cuánto capital tengo atado en slow movers?",
    ];
  }

  return [
    "¿Qué cambió en las ventas esta semana?",
    "¿Qué productos merecen mi atención hoy?",
    "¿Qué acción concreta debería tomar primero?",
  ];
}
