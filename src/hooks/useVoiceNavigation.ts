import { useEffect, useState, useRef } from 'react';

export const useVoiceNavigation = (onNext: () => void, onBack: () => void) => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const recognitionRef = useRef<any>(null);

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

      if (
        command.includes("siguiente") || 
        command.includes("avanza") || 
        command.includes("adelante") || 
        command.includes("próximo") ||
        command.includes("proximo")
      ) {
        onNext();
      } else if (
        command.includes("atrás") || 
        command.includes("atras") || 
        command.includes("anterior") || 
        command.includes("retrocede")
      ) {
        onBack();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Si el usuario quería escuchar de forma continua, reiniciamos el reconocimiento
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to restart speech recognition:", e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onNext, onBack, isListening]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      setIsListening(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to start speech recognition:", e);
        }
      }
    }
  };

  return { isListening, toggleListening, recognizedText };
};
export default useVoiceNavigation;
