export type Message = {
  role: "system" | "assistant" | "user";
  content: string;
  isDraft?: boolean;
  toRemember?: boolean;
}  

export type User = {
  name: string;
  accent: string;
  char: string;
  charAccent: string;
}

export interface UserProps {
  handleDownloadModel: (char: string, charAccent:string) => Promise<void>;
  handleDownloadTTSModel: (char: string, charAccent:string) => Promise<void>;
  checkModelExists: () => Promise<boolean | undefined>;
  checkTTSModelExists: () => Promise<boolean | undefined>;
  checkSTTModelExists: () => Promise<boolean | undefined>;
  loadModel: () => Promise<boolean>;
  loadWhisperModel: () => Promise<boolean>;
  isDownloading: boolean;
  isTTSDownloading: boolean;
  isSTTDownloading: boolean;
  isModelReady: boolean;
  isTTSModelReady: boolean;
  isSTTModelReady: boolean;
  progress: number;
  setOpenSettings: (openSettings: boolean) => void;
  openSettings: boolean;
  user: string;
  setUser: (user: string) => void;
  userAccent: string;
  setUserAccent: (accent: string) => void;
  character: string;
  setCharacter: (character: string) => void;
  characterAccent: string;
  setCharacterAccent: (characterAccent: string) => void;
  setIsSetup: (isSetup: boolean) => void;
}