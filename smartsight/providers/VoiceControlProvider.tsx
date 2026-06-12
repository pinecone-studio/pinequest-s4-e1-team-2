import React from 'react';

// expo-speech-recognition native module суулаагүй үед crash хийхгүйн тулд
// passthrough болгосон. Native build хийсний дараа бүтэн хувилбарыг буцааж тавина.
export function VoiceControlProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
