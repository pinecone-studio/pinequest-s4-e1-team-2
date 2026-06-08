import { createContext, useContext, useState, useEffect } from "react";

//this provider will control the speech speed and font size for the app.

type DetectorSensitivity = 'low' | 'medium' | 'high';

interface SettingsProps {
  speechSpeed: number;
  fontSize: number;
  detectorSensitivity: DetectorSensitivity;
  setSpeechSpeed: (speed: number) => void;
  setFontSize: (size: number) => void;
  setDetectorSensitivity: (s: DetectorSensitivity) => void;
}

const SettingsContext = createContext<SettingsProps>({
  speechSpeed: 1,
  fontSize: 16,
  detectorSensitivity: 'medium',
  setSpeechSpeed: () => {},
  setFontSize: () => {},
  setDetectorSensitivity: () => {},
});

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [detectorSensitivity, setDetectorSensitivity] = useState<DetectorSensitivity>('medium');

  return (
    <SettingsContext.Provider
      value={{ speechSpeed, fontSize, detectorSensitivity, setSpeechSpeed, setFontSize, setDetectorSensitivity }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);