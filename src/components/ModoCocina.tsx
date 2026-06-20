import React, { useState, useEffect, useRef } from 'react';
import { useVoiceNavigation } from '../hooks/useVoiceNavigation';
import type { Recipe } from '../types';
import { X, Mic, MicOff, Volume2, ArrowLeft, ArrowRight, Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface ModoCocinaProps {
  recipe: Recipe;
  onClose: () => void;
}

export const ModoCocina: React.FC<ModoCocinaProps> = ({ recipe, onClose }) => {
  // Parsear la preparación en pasos estructurados
  const parseSteps = (text: string): string[] => {
    if (!text) return [];
    
    // Primero, si hay saltos de línea, dividimos por ellos
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    
    // Si sólo hay una línea grande, intentamos dividir por oraciones que comiencen con números o puntos
    if (lines.length === 1) {
      // Intentar dividir por patrones como "1-", "2.", "Paso 1:"
      const matches = text.split(/(?=\b\d+[-.)\s])/);
      if (matches.length > 1) {
        return matches.map(m => m.trim()).filter(m => m.length > 0);
      }
      // O dividir por puntos seguidos de espacio si no hay números
      return text.split(/(?<=\.)\s+/).map(s => s.trim()).filter(s => s.length > 0);
    }
    
    return lines;
  };

  const steps = parseSteps(recipe.preparation);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Lógica de navegación de pasos
  const handleNext = () => {
    setCurrentStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
  };

  const handleBack = () => {
    setCurrentStepIndex(prev => (prev > 0 ? prev - 1 : prev));
  };

  // TTS: Síntesis de voz para leer los pasos en voz alta
  const speakStep = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = `Paso ${currentStepIndex + 1}: ${steps[currentStepIndex]}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const numberMap: Record<string, number> = {
    un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11,
    doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20,
    treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60
  };

  const parseSpokenTimeToSeconds = (text: string): number | null => {
    const t = text.toLowerCase().trim();
    if (t.includes("media hora")) {
      return 1800;
    }
    if (t.includes("hora y media")) {
      return 5400;
    }
    if (t.includes("cancelar") || t.includes("ninguno") || t.includes("no")) {
      return null;
    }

    const regex = /(?:(\d+)|(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|sesenta))\s*(minuto|minutos|min|hora|horas|segundo|segundos|seg)/i;
    const match = regex.exec(t);
    if (match) {
      let quantity = 0;
      if (match[1]) {
        quantity = parseInt(match[1]);
      } else if (match[2]) {
        quantity = numberMap[match[2].toLowerCase()] || 0;
      }
      const unit = match[3].toLowerCase();
      if (unit.startsWith('min')) {
        return quantity * 60;
      } else if (unit.startsWith('hor')) {
        return quantity * 3600;
      } else if (unit.startsWith('seg')) {
        return quantity;
      }
    }
    return null;
  };

  // Scan text and start timer callback for voice commands
  const handleStartTimerVoice = () => {
    if (timerDuration !== null) {
      setTimerActive(true);
      return;
    }
    const text = steps[currentStepIndex];
    if (!text) return;
    const regex = /\b(\d+)\s*(min|minutos|hs|horas|seg|segundos)\b/gi;
    const match = regex.exec(text);
    if (match) {
      const quantity = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let seconds = 0;
      if (unit.startsWith('min')) {
        seconds = quantity * 60;
      } else if (unit.startsWith('h')) {
        seconds = quantity * 3600;
      } else if (unit.startsWith('s')) {
        seconds = quantity;
      }
      startCustomTimer(seconds, match[0]);
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("¿Para cuánto tiempo quieres el temporizador?");
        utterance.lang = 'es-ES';
        window.speechSynthesis.speak(utterance);
      }
      setIsWaitingForTimerDuration(true);
    }
  };

  const handleTextReceived = (text: string) => {
    if (isWaitingRef.current) {
      if (text.includes("cancelar") || text.includes("no")) {
        setIsWaitingForTimerDuration(false);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance("Entendido, temporizador cancelado.");
          utterance.lang = 'es-ES';
          window.speechSynthesis.speak(utterance);
        }
        return;
      }
      const seconds = parseSpokenTimeToSeconds(text);
      if (seconds !== null) {
        startCustomTimer(seconds, text);
        setIsWaitingForTimerDuration(false);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(`Iniciando temporizador de ${text}`);
          utterance.lang = 'es-ES';
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  };

  const { isListening, toggleListening, recognizedText } = useVoiceNavigation(
    handleNext,
    handleBack,
    speakStep,
    handleStartTimerVoice,
    handleTextReceived
  );

  // Detener TTS si salimos del paso o cerramos el modo cocina
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentStepIndex]);

  // LÓGICA DE TEMPORIZADOR
  const [timerDuration, setTimerDuration] = useState<number | null>(null); // en segundos
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerLabel, setTimerLabel] = useState('');
  const [isWaitingForTimerDuration, setIsWaitingForTimerDuration] = useState(false);
  const isWaitingRef = useRef(false);

  useEffect(() => {
    isWaitingRef.current = isWaitingForTimerDuration;
  }, [isWaitingForTimerDuration]);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining(prev => prev - 1);
      }, 1000);
    } else if (timerRemaining === 0 && timerActive) {
      setTimerActive(false);
      // Alarma de finalización del temporizador
      playAlarm();
    }
    return () => clearInterval(interval);
  }, [timerActive, timerRemaining]);

  const playAlarm = () => {
    if ('speechSynthesis' in window) {
      const alert = new SpeechSynthesisUtterance("¡Tiempo completado!");
      alert.lang = 'es-ES';
      window.speechSynthesis.speak(alert);
    }
    // Sonido bip
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // nota La
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
      console.error(e);
    }
  };

  // Escanear el texto del paso para encontrar tiempos
  // Ej: "6 min.", "40 a 45 min", "13 min.", "3 hs"
  const renderStepWithTimers = (text: string) => {
    // Regex para buscar tiempos en minutos u horas
    const regex = /\b(\d+)\s*(min|minutos|hs|horas|seg|segundos)\b/gi;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    // Clonamos regex para reiniciar el lastIndex
    const searchRegex = new RegExp(regex);

    while ((match = searchRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];
      const quantity = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      // Convertir a segundos
      let seconds = 0;
      if (unit.startsWith('min')) {
        seconds = quantity * 60;
      } else if (unit.startsWith('h')) {
        seconds = quantity * 3600;
      } else if (unit.startsWith('s')) {
        seconds = quantity;
      }

      // Añadir texto previo
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      // Añadir botón interactivo para el temporizador
      parts.push(
        <button
          key={matchIndex}
          onClick={() => startCustomTimer(seconds, matchText)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-base font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500 hover:text-slate-900 transition mx-1 cursor-pointer"
        >
          <Clock className="w-4 h-4" />
          {matchText}
        </button>
      );

      lastIndex = searchRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const startCustomTimer = (seconds: number, label: string) => {
    setTimerDuration(seconds);
    setTimerRemaining(seconds);
    setTimerLabel(label);
    setTimerActive(true);
  };

  const formatTimerTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const formattedMins = mins.toString().padStart(2, '0');
    const formattedSecs = secs.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${hrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${mins}:${formattedSecs}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-10 select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div>
          <span className="text-teal-400 font-medium tracking-wider text-xs uppercase">MODO COCINA</span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-200 truncate max-w-xs md:max-w-md">{recipe.name}</h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Indicador de comandos escuchados */}
          {isListening && recognizedText && (
            <span className="hidden md:inline-block px-3 py-1 bg-teal-500/10 text-teal-400 rounded-lg text-xs font-semibold max-w-xs truncate">
              Oído: "{recognizedText}"
            </span>
          )}

          {/* Botón de Dictado de voz (Leer Paso) */}
          <button
            onClick={speakStep}
            title="Leer paso en voz alta"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <Volume2 className="w-5 h-5" />
          </button>

          {/* Botón Control Manos Libres */}
          <button
            onClick={toggleListening}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition font-bold border ${
              isListening
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                : 'bg-teal-500/20 text-teal-400 border-teal-500/40 hover:bg-teal-500/30'
            }`}
            title={isListening ? "Apagar control de voz" : "Encender control por voz (Manos libres)"}
          >
            {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* Botón de salida */}
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main step container */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-10 max-w-5xl mx-auto my-6 md:my-10 w-full">
        {/* Step Text Column */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {steps.length === 0 ? (
            <div className="text-center text-slate-500">
              No se detectaron pasos de preparación estructurados.
              <div className="mt-4 text-slate-300 text-left bg-slate-900/40 p-6 rounded-2xl">
                {recipe.preparation}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 animate-fade-in">
                <span className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full text-sm font-bold">
                  Paso {currentStepIndex + 1} de {steps.length}
                </span>
                {isWaitingForTimerDuration && (
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    ¿Para cuánto tiempo quieres el temporizador? (ej: "3 minutos")
                  </span>
                )}
              </div>

              {/* Texto del Paso con fuentes gigantes */}
              <div className="text-2xl md:text-4xl lg:text-5xl font-light text-slate-100 leading-snug md:leading-normal">
                {renderStepWithTimers(steps[currentStepIndex])}
              </div>
            </div>
          )}
        </div>

        {/* Timer Column (if active, side-by-side) */}
        {timerDuration !== null && (
          <div className="w-full md:w-80 bg-slate-900/40 border border-slate-800/80 shadow-2xl p-6 rounded-2xl flex flex-col justify-center gap-4 self-center backdrop-blur-md transition-all duration-350">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Temporizador {timerLabel && `(${timerLabel})`}
              </span>
              <button
                onClick={() => setTimerDuration(null)}
                className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-5xl font-extrabold text-teal-400 font-mono py-1 tracking-tight">
                {formatTimerTime(timerRemaining)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                Transcurrido: {formatTimerTime(timerDuration - timerRemaining)} / {formatTimerTime(timerDuration)}
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full transition-all duration-1000"
                style={{ width: `${(timerRemaining / timerDuration) * 100}%` }}
              ></div>
            </div>

            <div className="flex justify-center gap-2 mt-2">
              <button
                onClick={() => setTimerActive(prev => !prev)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  timerActive 
                    ? 'bg-slate-850 text-amber-400 hover:bg-slate-800' 
                    : 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                }`}
              >
                {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {timerActive ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                onClick={() => {
                  setTimerRemaining(timerDuration);
                  setTimerActive(false);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-slate-400 hover:bg-slate-750 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Reiniciar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls & Progress Bar */}
      <div className="space-y-6">
        {/* Barra de Progreso */}
        {steps.length > 0 && (
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        )}

        {/* Panel inferior */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
          {/* Instrucciones rápidas de voz */}
          <div className="text-xs text-slate-500 text-center md:text-left">
            {isListening ? (
              <span className="text-teal-400/80 flex items-center gap-1.5 justify-center md:justify-start">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                Micrófono activo. Di <strong className="text-teal-300">"siguiente"</strong> o <strong className="text-teal-300">"atrás"</strong>
              </span>
            ) : (
              <span>Activa el manos libres para navegar con comandos de voz</span>
            )}
          </div>

          {/* Botones de navegación táctiles */}
          {steps.length > 0 && (
            <div className="flex gap-4">
              <button
                disabled={currentStepIndex === 0}
                onClick={handleBack}
                className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold transition ${
                  currentStepIndex === 0
                    ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-transparent'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ArrowLeft className="w-5 h-5" /> Anterior
              </button>
              <button
                disabled={currentStepIndex === steps.length - 1}
                onClick={handleNext}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition ${
                  currentStepIndex === steps.length - 1
                    ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-transparent'
                    : 'bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-lg shadow-teal-500/20'
                }`}
              >
                Siguiente <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};
export default ModoCocina;
