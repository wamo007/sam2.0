export type Message = {
  role: "system" | "assistant" | "user";
  content: string;
  isDraft?: boolean;
  toRemember?: boolean;
}  

export type User = {
  name: string;
  trait1: string;
  trait2: string;
  char: string;
  charAccent: string;
}

export interface UserProps {
  handleDownloadModel: (char: string, charAccent:string) => Promise<void>;
  handleDownloadTTSModel: (char: string, charAccent:string) => Promise<void>;
  handleDownloadSTTModel: () => Promise<void>;
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
  traits: {
      trait1: string;
      trait2: string;
  };
  setTraits: (traits: { trait1: string; trait2: string }) => void;
  character: string;
  setCharacter: (character: string) => void;
  characterAccent: string;
  setCharacterAccent: (characterAccent: string) => void;
  setIsSetup: (isSetup: boolean) => void;
}

export interface Traits {
  trait1: string;
  trait2: string;
}

export interface TraitOption {
  label: string;
  value: string;
}