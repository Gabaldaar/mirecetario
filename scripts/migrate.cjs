const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const iconv = require('iconv-lite');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Configuración de Firebase Admin
// Descarga la clave de cuenta de servicio de Firebase Console y guárdala como 'scripts/serviceAccountKey.json'
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: No se encontró el archivo de credenciales en ' + serviceAccountPath);
  console.error('Por favor descarga tu clave de cuenta de servicio desde Firebase Console e inténtalo de nuevo.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// CONFIGURACIÓN DE MIGRACIÓN
const ADMIN_UID = 'AmhR6cvGHKQhWOjERnBBizdBndB2';
const ADMIN_NAME = 'Administrador';

const RAW_DATA_DIR = path.join(__dirname, '..', 'raw_data');

// Función helper para leer y parsear CSV con encoding latin1 / win1252
function parseCSV(filename, separator = ';') {
  return new Promise((resolve, reject) => {
    const results = [];
    const filePath = path.join(RAW_DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`Advertencia: El archivo ${filename} no existe en ${RAW_DATA_DIR}`);
      return resolve([]);
    }

    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('win1252')) // Decodifica Windows-1252 a UTF-8
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

async function migrate() {
  try {
    console.log('Iniciando lectura de archivos CSV...');

    // 1. Cargar tablas de mapeo secundarias
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

    // 2. Cargar relaciones
    console.log('Cargando relaciones de ingredientes por receta...');
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

    console.log('Cargando relaciones de notas por receta...');
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

    // 3. Procesar Recetas
    console.log('Cargando y denormalizando recetas...');
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
        createdBy: ADMIN_UID,
        createdByName: ADMIN_NAME,
        createdAt: FieldValue.serverTimestamp(),
        ingredients: ingredients,
        notes: notes
      });
    });

    console.log(`Total de recetas preparadas para subir: ${denormalizedRecipes.length}`);

    // 4. Subir a Firestore en Lotes de 500
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let count = 0;
    let batchIndex = 1;

    for (const recipe of denormalizedRecipes) {
      const docRef = db.collection('recipes').doc(recipe.id);
      batch.set(docRef, recipe);
      count++;

      if (count === BATCH_SIZE) {
        console.log(`Subiendo lote #${batchIndex} con ${count} recetas...`);
        await batch.commit();
        console.log(`Lote #${batchIndex} subido exitosamente.`);
        batch = db.batch();
        count = 0;
        batchIndex++;
      }
    }

    if (count > 0) {
      console.log(`Subiendo último lote #${batchIndex} con ${count} recetas...`);
      await batch.commit();
      console.log(`Último lote #${batchIndex} subido exitosamente.`);
    }

    console.log('¡MIGRACIÓN COMPLETADA CON ÉXITO!');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

migrate();
