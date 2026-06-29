const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const express = require("express");

// Inicialización de Firebase
admin.initializeApp();
const db = getFirestore();

const app = express();
app.use(express.json());

app.post("/alexa", async (req, res) => {
  try {
    const requestType = req.body?.request?.type;

    // 1. Manejar LaunchRequest
    if (requestType === "LaunchRequest") {
      return res.json({
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: "¡Hola! Bienvenido a Mi Recetario. ¿Qué receta queres buscar hoy?"
          },
          shouldEndSession: false
        }
      });
    }

    // 2. Manejar IntentRequest
    if (requestType === "IntentRequest") {
      const intentName = req.body.request.intent.name;
      const sessionAttributes = req.body.session?.attributes || {};
      const estado = sessionAttributes.estado;
      const currentRecipe = sessionAttributes.currentRecipe;
      const pendingRecipes = sessionAttributes.pendingRecipes;

      const slots = req.body.request.intent.slots || {};
      const recipeQuerySlot = slots.nombre_receta?.value || slots.RecipeQuery?.value || slots.receta?.value || slots.recipe?.value;
      const queryLower = (recipeQuerySlot || "").toLowerCase().trim();

      // Función auxiliar para obtener ingredientes (CORRECCIÓN DE CANTIDADES)
      const getIngredientsText = (recipe) => {
        let list = [];
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          list = recipe.ingredients;
        } else if (recipe.ingredientes && recipe.ingredientes.length > 0) {
          list = recipe.ingredientes;
        }
        
        if (list.length === 0) return 'sin ingredientes específicos';
        
        return list.map(i => {
            const q = i.quantity ? i.quantity + ' ' : '';
            const u = i.unit ? i.unit + ' de ' : '';
            const n = i.name || i;
            return (q + u + n).replace(/\s+/g, ' ').trim();
        }).join(', ');
      };

      // Función auxiliar para obtener preparación
      const getInstructionsText = (recipe) => {
        if (recipe.preparation && typeof recipe.preparation === 'string') return recipe.preparation;
        if (recipe.preparacion && typeof recipe.preparacion === 'string') return recipe.preparacion;
        if (recipe.instructions && recipe.instructions.length > 0) {
            return Array.isArray(recipe.instructions) ? recipe.instructions.map(step => step.text || step).join('. ') : recipe.instructions;
        }
        if (recipe.instrucciones && recipe.instrucciones.length > 0) {
            return Array.isArray(recipe.instrucciones) ? recipe.instrucciones.map(step => step.text || step).join('. ') : recipe.instrucciones;
        }
        return 'sin preparación específica';
      };

      // Función auxiliar para enviar la receta seleccionada de corrido
      const startRecipeDictation = (recipe) => {
          const ingredientsText = getIngredientsText(recipe);
          const instructionsText = getInstructionsText(recipe);
          
          return res.json({
              version: "1.0",
              response: {
                  outputSpeech: { 
                      type: "PlainText", 
                      text: `He encontrado la receta de ${recipe.name}. Los ingredientes son: ${ingredientsText}. Pasemos ahora a la preparación. ${instructionsText}` 
                  },
                  shouldEndSession: true
              }
          });
      };

      // Si no estamos en flujo interactivo, manejamos la búsqueda inicial
      if (intentName === "SearchRecipeIntent" || intentName === "BuscarRecetaIntent") {
        
        // 1. Si hay recetas pendientes en la sesión (el usuario está respondiendo a la desambiguación)
        if (pendingRecipes && pendingRecipes.length > 0) {
            if (!recipeQuerySlot) {
                const optionsTitles = pendingRecipes.map((r, index) => `Opción ${index + 1}: ${r.name}`).join('. ');
                return res.json({
                    version: "1.0",
                    sessionAttributes: { pendingRecipes },
                    response: {
                        outputSpeech: { type: "PlainText", text: `No te entendí. Las opciones son: ${optionsTitles}. ¿Cuál prefieres?` },
                        shouldEndSession: false
                    }
                });
            }

            // Detectar si el usuario dijo un número
            let selectedIndex = -1;
            const numberWords = { "uno": 1, "primero": 1, "primera": 1, "dos": 2, "segundo": 2, "segunda": 2, "tres": 3, "tercero": 3, "tercera": 3, "cuatro": 4, "cinco": 5 };
            
            const parsedNumber = parseInt(queryLower);
            if (!isNaN(parsedNumber) && parsedNumber > 0 && parsedNumber <= pendingRecipes.length) {
                selectedIndex = parsedNumber - 1;
            } else {
                for (const [word, num] of Object.entries(numberWords)) {
                    if (queryLower.includes(word) && num <= pendingRecipes.length) {
                        selectedIndex = num - 1;
                        break;
                    }
                }
            }

            let matchedRecipe = null;
            if (selectedIndex !== -1) {
                matchedRecipe = pendingRecipes[selectedIndex];
            } else {
                // Si no fue un número, buscamos coincidencia de texto dentro de las opciones
                matchedRecipe = pendingRecipes.find(r => r.name && r.name.toLowerCase().includes(queryLower));
            }

            if (matchedRecipe) {
                return startRecipeDictation(matchedRecipe);
            } else {
                const optionsTitles = pendingRecipes.map((r, index) => `Opción ${index + 1}: ${r.name}`).join('. ');
                return res.json({
                    version: "1.0",
                    sessionAttributes: { pendingRecipes },
                    response: {
                        outputSpeech: { type: "PlainText", text: `No encontré esa opción. Las opciones son: ${optionsTitles}. ¿Cuál eliges?` },
                        shouldEndSession: false
                    }
                });
            }
        }

        // 2. Si es una búsqueda nueva
        if (!recipeQuerySlot) {
          return res.json({
            version: "1.0",
            response: {
              outputSpeech: { type: "PlainText", text: "No escuché bien la receta. ¿Qué plato quieres preparar?" },
              shouldEndSession: false
            }
          });
        }

        console.log(`Búsqueda de receta solicitada: "${recipeQuerySlot}"`);

        // Buscar en Firestore (obteniendo múltiples coincidencias)
        let matchedRecipes = [];
        try {
          const snapshot = await db.collection("recetas").get();
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.name && (data.name.toLowerCase().includes(queryLower) || queryLower.includes(data.name.toLowerCase()))) {
              matchedRecipes.push(data);
            }
          });
          
          if (matchedRecipes.length === 0) {
            const snapshot2 = await db.collection("recipes").get();
            snapshot2.forEach(doc => {
              const data = doc.data();
              if (data.name && (data.name.toLowerCase().includes(queryLower) || queryLower.includes(data.name.toLowerCase()))) {
                matchedRecipes.push(data);
              }
            });
          }
        } catch (e) {
          console.error("Error leyendo Firestore:", e);
        }

        if (matchedRecipes.length === 0) {
          return res.json({
            version: "1.0",
            response: {
              outputSpeech: { type: "PlainText", text: "No encontré esa receta en tu recetario. ¿Quieres intentar buscar otra?" },
              shouldEndSession: false
            }
          });
        }

        if (matchedRecipes.length === 1) {
          // Coincidencia única
          return startRecipeDictation(matchedRecipes[0]);
        } else {
          // Múltiples coincidencias (limitamos a 5)
          const optionsToRead = matchedRecipes.slice(0, 5);
          const optionsTitles = optionsToRead.map((r, index) => `Opción ${index + 1}: ${r.name}`).join('. ');
          
          return res.json({
              version: "1.0",
              sessionAttributes: { pendingRecipes: optionsToRead },
              response: {
                  outputSpeech: {
                      type: "PlainText",
                      text: `Encontré las siguientes recetas: ${optionsTitles}. ¿Cuál de ellas quieres preparar?`
                  },
                  shouldEndSession: false
              }
          });
        }
      }

      // Intents de sistema de Alexa genéricos
      if (intentName === "AMAZON.HelpIntent") {
        return res.json({
          version: "1.0",
          response: {
            outputSpeech: {
              type: "PlainText",
              text: "Puedes pedirme buscar cualquier receta diciendo: busca receta de pollo. ¿Qué deseas preparar?"
            },
            shouldEndSession: false
          }
        });
      }

      if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
        return res.json({
          version: "1.0",
          response: {
            outputSpeech: {
              type: "PlainText",
              text: "¡Hasta la próxima!"
            },
            shouldEndSession: true
          }
        });
      }
    }

    // Default catch-all
    return res.json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "No entendí muy bien. ¿Puedes repetir?"
        },
        shouldEndSession: false
      }
    });

  } catch (error) {
    console.error("Error en el webhook de Alexa:", error);
    return res.json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Hubo un problema al consultar tus recetas."
        },
        shouldEndSession: true
      }
    });
  }
});

exports.alexaRecipeSearch = onRequest({ invoker: "public" }, app);
