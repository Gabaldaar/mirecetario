const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const express = require('express');
const alexaVerifier = require('alexa-verifier-middleware');

// Inicialización directa estándar para Cloud Functions
admin.initializeApp();
const db = getFirestore();

const app = express();

// Opcional: Descomentar esta línea para habilitar verificación de firmas criptográficas de Amazon Alexa en producción
// app.use(alexaVerifier);

app.use(express.json());

// Endpoint POST para recibir los Requests de la Skill de Alexa
app.post('/alexa', async (req, res) => {
  try {
    const requestType = req.body?.request?.type;

    // 1. Manejar Inicio de la Skill (Soporta es-ES, es-MX, es-US, etc.)
    if (requestType === 'LaunchRequest') {
      return res.json({
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: "¡Hola! Bienvenido a Mi Recetario. ¿Qué receta quieres buscar hoy?"
          },
          shouldEndSession: false
        }
      });
    }

    // 2. Manejar Intents (Intenciones del usuario)
    if (requestType === 'IntentRequest') {
      const intentName = req.body.request.intent.name;

      // Intent de búsqueda de Recetas
      if (intentName === 'SearchRecipeIntent') {
        const recipeQuerySlot = req.body.request.intent.slots?.RecipeQuery?.value;

        if (!recipeQuerySlot) {
          return res.json(buildAlexaResponse(
            'No escuché bien la receta. ¿Qué plato quieres preparar?',
            'Por favor, repite la receta que deseas buscar.',
            false
          ));
        }

        console.log(`Búsqueda solicitada por Alexa: "${recipeQuerySlot}"`);

        // Realizar búsqueda en Firestore
        // Para mayor robustez, leemos las recetas y filtramos con coincidencia parcial e insensible a mayúsculas
        const snapshot = await db.collection('recipes').get();
        const recipesList = [];
        snapshot.forEach(doc => {
          recipesList.push(doc.data());
        });

        // Buscar coincidencia en el nombre de la receta
        const queryLower = recipeQuerySlot.toLowerCase().trim();
        const matchedRecipe = recipesList.find(r => 
          r.name.toLowerCase().includes(queryLower) || 
          queryLower.includes(r.name.toLowerCase())
        );

        if (!matchedRecipe) {
          return res.json(buildAlexaResponse(
            `Lo siento, no encontré ninguna receta para ${recipeQuerySlot} en tu recetario colaborativo. ¿Quieres intentar buscar otra?`,
            '¿Qué otra receta deseas buscar?',
            false
          ));
        }

        // Encontró la receta. Armar respuesta conversacional
        const name = matchedRecipe.name;
        const servings = matchedRecipe.servings || 4;
        const servingType = matchedRecipe.servingType || 'Porciones';
        const difficulty = matchedRecipe.difficulty || 'Fácil';
        
        // Listar ingredientes principales
        const mainIngredients = matchedRecipe.ingredients
          .slice(0, 4)
          .map(ing => ing.name)
          .join(', ');

        const ingredientsCount = matchedRecipe.ingredients.length;

        // Construir SSML para lectura fluida
        const speechOutput = `<speak>` +
          `He encontrado la receta de <say-as interpret-as="name">${name}</say-as>. ` +
          `Es de dificultad ${difficulty} y rinde para ${servings} ${servingType.toLowerCase()}. ` +
          `Lleva en total ${ingredientsCount} ingredientes, incluyendo: ${mainIngredients}. ` +
          (matchedRecipe.suggestion ? `La sugerencia del cocinero es: <emphasis level="moderate">${matchedRecipe.suggestion}</emphasis>. ` : '') +
          `¿Te gustaría que te lea las instrucciones paso a paso?` +
          `</speak>`;

        // Card para dispositivos Alexa con pantalla (Echo Show, etc.)
        const cardText = `Ingredientes:\n` + 
          matchedRecipe.ingredients.map(i => `- ${i.name} (${i.quantity > 0 ? `${i.quantity} ${i.unit}` : 'Al gusto'})`).join('\n') +
          `\n\nInstrucciones:\n${matchedRecipe.preparation}`;

        return res.json(buildAlexaResponseSSML(speechOutput, cardText, name, false));
      }

      // Intent de Ayuda
      if (intentName === 'AMAZON.HelpIntent') {
        return res.json(buildAlexaResponse(
          'Puedes pedirme buscar cualquier receta de tu base de datos diciendo por ejemplo: busca bonet. ¿Qué deseas preparar?',
          '¿Qué receta quieres buscar?',
          false
        ));
      }

      // Intent de Parar / Cancelar
      if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        return res.json(buildAlexaResponse(
          '¡Hasta la próxima! Que disfrutes tu comida.',
          '',
          true
        ));
      }
    }

    // 3. Manejar Cierre de la Sesión
    if (requestType === 'SessionEndedRequest') {
      console.log('Sesión de Alexa cerrada.');
      return res.json({ version: '1.0', response: { shouldEndSession: true } });
    }

    // Respuesta por defecto
    return res.json(buildAlexaResponse(
      'No estoy seguro de cómo responder a eso. ¿Quieres buscar otra receta?',
      '¿Qué receta deseas buscar?',
      false
    ));

  } catch (error) {
    console.error('Error procesando request de Alexa:', error);
    return res.json(buildAlexaResponse(
      'Hubo un problema en el servidor al buscar la receta. Inténtalo de nuevo más tarde.',
      '',
      true
    ));
  }
});

// Función helper para respuestas Alexa simples en texto plano
function buildAlexaResponse(speechText, repromptText, shouldEndSession) {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: speechText
      },
      reprompt: repromptText ? {
        outputSpeech: {
          type: 'PlainText',
          text: repromptText
        }
      } : undefined,
      shouldEndSession: shouldEndSession
    }
  };
}

// Función helper para respuestas con síntesis de voz SSML y tarjeta visual
function buildAlexaResponseSSML(ssmlSpeech, cardText, title, shouldEndSession) {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'SSML',
        ssml: ssmlSpeech
      },
      card: {
        type: 'Simple',
        title: `Recetario: ${title}`,
        content: cardText
      },
      reprompt: {
        outputSpeech: {
          type: 'PlainText',
          text: '¿Quieres que te dicte los pasos de preparación?'
        }
      },
      shouldEndSession: shouldEndSession
    }
  };
}

// Exportar la Cloud Function Gen 2
exports.alexaRecipeSearch = onRequest({ cors: true }, app);
