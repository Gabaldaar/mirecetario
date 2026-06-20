const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const iconv = require('iconv-lite');

const RAW_DATA_DIR = path.join(__dirname, '..', 'raw_data');

function parseCSV(filename, separator = ';') {
  return new Promise((resolve, reject) => {
    const results = [];
    const filePath = path.join(RAW_DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`Advertencia: El archivo ${filename} no existe en ${RAW_DATA_DIR}`);
      return resolve([]);
    }

    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('win1252')) // Decodificación Windows-1252 a UTF-8
      .pipe(csv({ separator }))
      .on('data', (data) => {
        const cleanedData = {};
        for (let key in data) {
          const cleanKey = key.trim().replace(/^"|"$/g, '');
          const cleanVal = data[key] ? data[key].trim().replace(/^"|"$/g, '') : '';
          cleanedData[cleanKey] = cleanVal;
        }
        results.push(cleanedData);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function testParse() {
  try {
    console.log('Iniciando prueba de parseo y denormalización...');

    const categoriasCSV = await parseCSV('Categoría.csv');
    const cocinaCSV = await parseCSV('Cocina.csv');
    const complejidadCSV = await parseCSV('Complejidad.csv');
    const unidadesCSV = await parseCSV('Unidades.csv');
    const ingredientesCSV = await parseCSV('Ingredientes.csv');
    const rendimientoCSV = await parseCSV('Rendimiento.csv');
    const notasCSV = await parseCSV('Notas.csv');

    const categoriasMap = {};
    categoriasCSV.forEach(row => {
      const id = row['IDCategoría'] || row['IDCategoria'];
      const name = row['Categoría'] || row['Categoria'];
      if (id) categoriasMap[id] = name;
    });

    const cocinaMap = {};
    cocinaCSV.forEach(row => {
      if (row['IDCocina']) cocinaMap[row['IDCocina']] = row['Cocina'];
    });

    const complejidadMap = {};
    complejidadCSV.forEach(row => {
      if (row['IDComplejidad']) complejidadMap[row['IDComplejidad']] = row['Complejidad'];
    });

    const unidadesMap = {};
    unidadesCSV.forEach(row => {
      const id = row['IDunidad'] || row['IDUnidad'];
      if (id) unidadesMap[id] = row['Unidad'];
    });

    const ingredientesMap = {};
    ingredientesCSV.forEach(row => {
      if (row['IDIngrediente']) {
        ingredientesMap[row['IDIngrediente']] = {
          name: row['Ingrediente'],
          categoryId: row['IDCategIng']
        };
      }
    });

    const rendimientoMap = {};
    rendimientoCSV.forEach(row => {
      if (row['IDRendimiento']) rendimientoMap[row['IDRendimiento']] = row['Rendimiento'];
    });

    const notasMap = {};
    notasCSV.forEach(row => {
      if (row['IDNota']) {
        notasMap[row['IDNota']] = {
          title: row['Titulo'],
          content: row['Nota']
        };
      }
    });

    const ingredientesPorRecetaCSV = await parseCSV('IngredientePorReceta.csv');
    const recetaIngredientes = {};
    ingredientesPorRecetaCSV.forEach(row => {
      const recipeId = row['IDReceta'];
      const ingredientId = row['IDIngrediente'];
      if (!recipeId || !ingredientId) return;

      let quantity = 0;
      if (row['Cantidad']) {
        const cleanedQty = row['Cantidad'].replace(',', '.');
        quantity = parseFloat(cleanedQty) || 0;
      }

      const unitId = row['IDUnidad'] || row['IDunidad'];
      const observation = row['Observación'] || row['Observacion'] || '';

      const ingredientInfo = ingredientesMap[ingredientId];
      if (!ingredientInfo) return;

      if (!recetaIngredientes[recipeId]) {
        recetaIngredientes[recipeId] = [];
      }

      recetaIngredientes[recipeId].push({
        id: ingredientId,
        name: ingredientInfo.name,
        quantity: quantity,
        unit: unidadesMap[unitId] || 'Unidades',
        observation: observation
      });
    });

    const notasPorRecetaCSV = await parseCSV('NotasPorReceta.csv');
    const recetaNotas = {};
    notasPorRecetaCSV.forEach(row => {
      const recipeId = row['IDReceta'];
      const notaId = row['IDNota'];
      if (!recipeId || !notaId) return;

      const notaInfo = notasMap[notaId];
      if (!notaInfo) return;

      if (!recetaNotas[recipeId]) {
        recetaNotas[recipeId] = [];
      }

      recetaNotas[recipeId].push({
        id: notaId,
        title: notaInfo.title,
        content: notaInfo.content
      });
    });

    const recetasCSV = await parseCSV('Recetas.csv');
    const denormalizedRecipes = [];

    recetasCSV.forEach(row => {
      const recipeId = row['IDReceta'];
      if (!recipeId) return;

      let servings = 4;
      if (row['Porciones']) {
        const cleanedServings = row['Porciones'].replace(',', '.');
        servings = parseFloat(cleanedServings) || 4;
      }

      const recipeName = row['Receta'] || 'Receta sin nombre';
      const preparation = row['Preparacion'] || row['Preparación'] || '';
      const suggestion = row['Sugerencia'] || '';

      const category = categoriasMap[row['IDCategoria'] || row['IDCategoría']] || 'Sin Definir';
      const cuisine = cocinaMap[row['IDCocina']] || 'Sin Definir';
      const difficulty = complejidadMap[row['IDComplejidad']] || 'Sin Definir';
      const servingType = rendimientoMap[row['IDRendimiento']] || 'Porciones';

      const ingredients = recetaIngredientes[recipeId] || [];
      const notes = recetaNotas[recipeId] || [];

      denormalizedRecipes.push({
        id: recipeId,
        name: recipeName,
        preparation: preparation,
        servings: servings,
        servingType: servingType,
        category: category,
        cuisine: cuisine,
        difficulty: difficulty,
        suggestion: suggestion,
        ingredients: ingredients,
        notes: notes
      });
    });

    console.log(`Prueba: Total de recetas denormalizadas: ${denormalizedRecipes.length}`);
    
    // Guardar una muestra del JSON procesado para verificarlo
    const sampleSize = 5;
    const sample = denormalizedRecipes.slice(0, sampleSize);
    console.log(`Mostrando una muestra de los primeros ${sampleSize} elementos en consola:`);
    console.dir(sample, { depth: null, colors: true });

    const outputPath = path.join(RAW_DATA_DIR, 'parsed_recipes_test.json');
    fs.writeFileSync(outputPath, JSON.stringify(denormalizedRecipes, null, 2), 'utf-8');
    console.log(`¡Prueba exitosa! El JSON denormalizado completo se ha guardado en ${outputPath}`);
  } catch (error) {
    console.error('Error durante la prueba de parseo:', error);
  }
}

testParse();
