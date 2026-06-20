export interface AggregatedIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  observations: string[];
}

// Clasificación y factores de escala para el motor de conversión
const WEIGHT_UNITS: Record<string, number> = {
  'g': 1,
  'gr': 1,
  'gramo': 1,
  'gramos': 1,
  'kg': 1000,
  'kilo': 1000,
  'kilos': 1000,
  'kilogramo': 1000,
  'kilogramos': 1000,
  'libra': 454,
  'libras': 454,
  'lb': 454
};

const VOLUME_UNITS: Record<string, number> = {
  'ml': 1,
  'cc': 1,
  'mililitro': 1,
  'mililitros': 1,
  'centímetros cúbicos': 1,
  'centimetros cubicos': 1,
  'l': 1000,
  'litro': 1000,
  'litros': 1000,
  'copita': 20,
  'copitas': 20
};

// Mapeos para estandarizar el texto de las unidades a plurales presentables
const OTHER_UNITS_NORMALIZER: Record<string, string> = {
  'taza': 'Tazas',
  'tazas': 'Tazas',
  'cucharada': 'Cucharadas',
  'cucharadas': 'Cucharadas',
  'cucharadita': 'Cucharaditas',
  'cucharaditas': 'Cucharaditas',
  'unidad': 'Unidades',
  'unidades': 'Unidades',
  'diente': 'Dientes',
  'dientes': 'Dientes',
  'filete': 'Filetes',
  'filetes': 'Filetes',
  'gajo': 'Gajos',
  'gajos': 'Gajos',
  'pizca': 'Pizcas',
  'pizcas': 'Pizcas',
  'pocillo': 'Pocillos',
  'pocillos': 'Pocillos',
  'al gusto': 'Al gusto',
  'c/n': 'Cant. Necesaria',
  'cant. necesaria': 'Cant. Necesaria',
  'cantidad necesaria': 'Cant. Necesaria'
};

function normalizeUnit(unit: string): { type: 'weight' | 'volume' | 'other'; normalizedName: string; factor: number } {
  const clean = unit.trim().toLowerCase();

  if (WEIGHT_UNITS[clean] !== undefined) {
    return { type: 'weight', normalizedName: 'Gramos', factor: WEIGHT_UNITS[clean] };
  }

  if (VOLUME_UNITS[clean] !== undefined) {
    return { type: 'volume', normalizedName: 'CC', factor: VOLUME_UNITS[clean] };
  }

  const normalized = OTHER_UNITS_NORMALIZER[clean] || (unit.charAt(0).toUpperCase() + unit.slice(1));
  return { type: 'other', normalizedName: normalized, factor: 1 };
}

export function consolidateIngredients(
  ingredients: { name: string; quantity: number; unit: string; observation?: string }[],
  categoryMap: Record<string, string>
): AggregatedIngredient[] {
  const groups: Record<string, { name: string; quantity: number; unitType: 'weight' | 'volume' | 'other'; baseUnit: string; observations: Set<string> }> = {};

  ingredients.forEach(ing => {
    const nameClean = ing.name.trim();
    if (!nameClean) return;

    const nameLower = nameClean.toLowerCase();
    const unitNormalized = normalizeUnit(ing.unit);

    // Generamos una clave de agrupación basada en el ingrediente y el tipo de unidad
    const groupKey = `${nameLower}::${unitNormalized.type}::${unitNormalized.type === 'other' ? unitNormalized.normalizedName.toLowerCase() : ''}`;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        name: nameClean,
        quantity: 0,
        unitType: unitNormalized.type,
        baseUnit: unitNormalized.normalizedName,
        observations: new Set<string>()
      };
    }

    const value = ing.quantity * unitNormalized.factor;
    groups[groupKey].quantity += value;

    if (ing.observation && ing.observation.trim()) {
      groups[groupKey].observations.add(ing.observation.trim().toLowerCase());
    }
  });

  // Convertimos las bases sumadas a las unidades formateadas óptimas
  return Object.keys(groups).map(key => {
    const group = groups[key];
    const nameLower = group.name.toLowerCase();
    const category = categoryMap[nameLower] || 'Varios';

    let finalQuantity = group.quantity;
    let finalUnit = group.baseUnit;

    if (group.unitType === 'weight') {
      if (group.quantity >= 1000) {
        finalQuantity = Math.round((group.quantity / 1000) * 100) / 100;
        finalUnit = finalQuantity === 1 ? 'Kilo' : 'Kilos';
      } else {
        finalQuantity = Math.round(group.quantity * 100) / 100;
        finalUnit = 'Gramos';
      }
    } else if (group.unitType === 'volume') {
      if (group.quantity >= 1000) {
        finalQuantity = Math.round((group.quantity / 1000) * 100) / 100;
        finalUnit = finalQuantity === 1 ? 'Litro' : 'Litros';
      } else {
        finalQuantity = Math.round(group.quantity * 100) / 100;
        finalUnit = 'CC';
      }
    } else {
      // Unidades no métricas
      finalQuantity = Math.round(group.quantity * 100) / 100;
      // Ajustar singular/plural
      if (finalQuantity === 1) {
        if (finalUnit === 'Tazas') finalUnit = 'Taza';
        else if (finalUnit === 'Cucharadas') finalUnit = 'Cucharada';
        else if (finalUnit === 'Cucharaditas') finalUnit = 'Cucharadita';
        else if (finalUnit === 'Unidades') finalUnit = 'Unidad';
        else if (finalUnit === 'Dientes') finalUnit = 'Diente';
        else if (finalUnit === 'Filetes') finalUnit = 'Filete';
        else if (finalUnit === 'Gajos') finalUnit = 'Gajo';
        else if (finalUnit === 'Pizcas') finalUnit = 'Pizca';
        else if (finalUnit === 'Pocillos') finalUnit = 'Pocillo';
      }
    }

    return {
      name: group.name,
      quantity: finalQuantity,
      unit: finalUnit,
      category,
      observations: Array.from(group.observations).map(obs => obs.charAt(0).toUpperCase() + obs.slice(1))
    };
  });
}
