const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const iconv = require('iconv-lite');
const { initializeApp, cert, getApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Evitar inicializaciones repetidas si corre en el mismo proceso de alguna herramienta
let app;
try {
  app = getApp();
} catch (e) {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Error: No se encontró el archivo de credenciales en ' + serviceAccountPath);
    process.exit(1);
  }
  const serviceAccount = require(serviceAccountPath);
  app = initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const RAW_DATA_DIR = path.join(__dirname, '..', 'raw_data');

function parseCSV(filename, separator = ';') {
  return new Promise((resolve, reject) => {
    const results = [];
    const filePath = path.join(RAW_DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return reject(new Error(`El archivo ${filename} no existe en ${RAW_DATA_DIR}`));
    }

    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('win1252')) // Preserva acentos y eñes
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

async function run() {
  try {
    console.log('Iniciando carga de ingredientes...');

    // 1. Cargar Categorías de Ingredientes
    console.log('Parseando CategoriaIng.csv...');
    const categIngCSV = await parseCSV('CategoriaIng.csv');
    const categoriesMap = {};
    categIngCSV.forEach(row => {
      const id = row['IDcategIng'] || row['IDcateging'] || row['IDCategIng'];
      const name = row['Categoria'] || row['Categoría'];
      if (id && name) {
        categoriesMap[id] = name.trim();
      }
    });

    console.log(`Categorías cargadas: ${Object.keys(categoriesMap).length}`);

    // 2. Cargar Ingredientes
    console.log('Parseando Ingredientes.csv...');
    const ingredientesCSV = await parseCSV('Ingredientes.csv');
    console.log(`Ingredientes crudos leídos: ${ingredientesCSV.length}`);

    const ingredientsToUpload = [];
    ingredientesCSV.forEach(row => {
      const id = row['IDIngrediente'] || row['IDingrediente'];
      const name = row['Ingrediente'];
      const categId = row['IDCategIng'] || row['IDCateging'];

      if (!id || !name) return;

      const categoryName = categoriesMap[categId] || 'Sin definir';

      ingredientsToUpload.push({
        id: id.toString(),
        name: name.trim(),
        category: categoryName
      });
    });

    console.log(`Ingredientes válidos preparados para subir: ${ingredientsToUpload.length}`);

    // 3. Subir a Firestore por lotes (Batches) de 500
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let count = 0;
    let batchIndex = 1;

    for (const ing of ingredientsToUpload) {
      const docRef = db.collection('ingredients').doc(ing.id);
      batch.set(docRef, ing);
      count++;

      if (count === BATCH_SIZE) {
        console.log(`Subiendo lote de ingredientes #${batchIndex} con ${count} registros...`);
        await batch.commit();
        console.log(`Lote #${batchIndex} subido exitosamente.`);
        batch = db.batch();
        count = 0;
        batchIndex++;
      }
    }

    if (count > 0) {
      console.log(`Subiendo último lote de ingredientes #${batchIndex} con ${count} registros...`);
      await batch.commit();
      console.log(`Último lote #${batchIndex} subido exitosamente.`);
    }

    console.log('¡MIGRACIÓN DE INGREDIENTES COMPLETADA CON ÉXITO!');
  } catch (err) {
    console.error('Error durante la migración de ingredientes:', err);
    process.exit(1);
  }
}

run();
