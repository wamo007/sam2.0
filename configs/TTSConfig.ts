import * as FileSystem from 'expo-file-system';

interface TTSModelConfig {
  modelPath: string;
  tokensPath: string;
  dataDirPath: string;
}

export const getTTSConfig = (): TTSModelConfig => {
  const modelDir = `${FileSystem.documentDirectory}models/`;
  return {
    modelPath: `${modelDir}en_GB-alba-medium.onnx`,
    tokensPath: `${modelDir}tokens.txt`,
    dataDirPath: `${modelDir}espeak-ng-data`
  };
};
