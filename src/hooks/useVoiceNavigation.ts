import { useEffect, useState, useRef } from 'react';

export const useVoiceNavigation = (
  onNext: () => void,
  onBack: () => void,
  onSpeak?: () => void,
  onStartTimer?: () => void,
  onTextReceived?: (text: string) => void,
  onPauseTimer?: () => void,
  onCancelTimer?: () => void,
  onClose?: () => void
) => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const recognitionRef = useRef<any>(null);
  
  const callbacksRef = useRef({ onNext, onBack, onSpeak, onStartTimer, onTextReceived, onPauseTimer, onCancelTimer, onClose });
  
  useEffect(() => {
    callbacksRef.current = { onNext, onBack, onSpeak, onStartTimer, onTextReceived, onPauseTimer, onCancelTimer, onClose };
  }, [onNext, onBack, onSpeak, onStartTimer, onTextReceived, onPauseTimer, onCancelTimer, onClose]);

  const isListeningRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'es-ES';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const command = event.results[lastIndex][0].transcript.trim().toLowerCase();
      setRecognizedText(command);
      console.log("Comando escuchado:", command);

      if (callbacksRef.current.onTextReceived) {
        callbacksRef.current.onTextReceived(command);
      }

      const avanzarWords = ["siguiente", "avanzar", "adelante", "dale", "proximo"];
      const retrocederWords = ["anterior", "atras", "retroceder", "volver"];
      const repetirWords = ["repetir", "leer", "como", "escuchar"];
      const temporizadorWords = ["iniciar", "temporizador", "tiempo", "cronometro", "comenzar"];
      const pausarWords = ["pausar", "pausa", "detener", "deten", "parar", "para", "espera"];
      const cancelarWords = ["quitar", "quita", "cancelar", "cancela", "apagar", "apaga"];
      const cerrarWords = ["terminar", "termina", "cerrar", "cierra", "salir", "sal", "fin", "finalizar", "finaliza"];

      const matchesAny = (wordsList: string[]) => {
        // Quitar acentos y signos de puntuación, y rodear de espacios
        let normalizedCommand = command.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        normalizedCommand = normalizedCommand.replace(/[.,¿?¡!]/g, "");
        const paddedCommand = ` ${normalizedCommand} `;
        
        return wordsList.some(word => {
          const normalizedWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          return paddedCommand.includes(` ${normalizedWord} `);
        });
      };

      if (matchesAny(avanzarWords)) {
        callbacksRef.current.onNext();
      } else if (matchesAny(retrocederWords)) {
        callbacksRef.current.onBack();
      } else if (matchesAny(repetirWords)) {
        if (callbacksRef.current.onSpeak) {
          callbacksRef.current.onSpeak();
        }
      } else if (matchesAny(cerrarWords)) {
        if (callbacksRef.current.onClose) {
          callbacksRef.current.onClose();
        }
      } else if (matchesAny(pausarWords)) {
        if (callbacksRef.current.onPauseTimer) {
          callbacksRef.current.onPauseTimer();
        }
      } else if (matchesAny(cancelarWords)) {
        if (callbacksRef.current.onCancelTimer) {
          callbacksRef.current.onCancelTimer();
        }
      } else if (matchesAny(temporizadorWords)) {
        if (callbacksRef.current.onStartTimer) {
          callbacksRef.current.onStartTimer();
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      // If the user wants continuous listening, we restart
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to restart speech recognition:", e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Run only once to instantiate speech recognition

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      setIsListening(true);
      isListeningRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to start speech recognition:", e);
          setIsListening(false);
          isListeningRef.current = false;
        }
      }
    }
  };

  return { isListening, toggleListening, recognizedText };
};

export default useVoiceNavigation;
