import { createContext, useContext, useState, useEffect } from "react";

//this provider will control the speech speed and font size for the app.

interface SettingsProps {
  speechSpeed: number;
  fontSize: number;
  setSpeechSpeed: (speed: number) => void;
  setFontSize: (size: number) => void;
}

const SettingsContext = createContext<SettingsProps>({
  speechSpeed: 1,
  fontSize: 16,
  setSpeechSpeed: () => {},
  setFontSize: () => {},
});

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(16);

  return (
    <SettingsContext.Provider
      value={{ speechSpeed, fontSize, setSpeechSpeed, setFontSize }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);