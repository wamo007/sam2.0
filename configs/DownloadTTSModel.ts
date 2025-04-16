import * as FileSystem from 'expo-file-system';
import { unzip } from 'react-native-zip-archive';

export const downloadTTSModel = async (
  onProgress: (progress: number) => void
): Promise<{modelPath: string, tokensPath: string, dataDirPath: string}> => {
  const baseUrl = 'https://huggingface.co/shamil010/mymodel/resolve/main/';
  const modelName = 'en_GB-alba-medium.onnx';
  const tokensName = 'tokens.txt';
  const dataDirName = 'espeak-ng-data';

  const modelUrl = `${baseUrl}${modelName}`;
  const tokensUrl = `${baseUrl}${tokensName}`;
  const dataDirUrl = `${baseUrl}${dataDirName}.zip`;

  const modelDir = `${FileSystem.documentDirectory}tts_models/`;
  const modelPath = `${modelDir}${modelName}`;
  const tokensPath = `${modelDir}${tokensName}`;
  const dataDirPath = `${modelDir}${dataDirName}/`;

  // Create directory if it doesn't exist
  await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });

  // Download model file
  const modelDownload = FileSystem.createDownloadResumable(
    modelUrl,
    modelPath,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      onProgress(totalBytesWritten / totalBytesExpectedToWrite * 50);
    }
  );

  // Download tokens file
  const tokensDownload = FileSystem.createDownloadResumable(
    tokensUrl,
    tokensPath,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      onProgress(50 + (totalBytesWritten / totalBytesExpectedToWrite * 20));
    }
  );

  // Download and extract espeak-ng-data
  const dataZipPath = `${modelDir}espeak-ng-data.zip`;
  const dataDownload = FileSystem.createDownloadResumable(
    dataDirUrl,
    dataZipPath,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      onProgress(70 + (totalBytesWritten / totalBytesExpectedToWrite * 30));
    }
  );

  try {
    await Promise.all([
      modelDownload.downloadAsync(),
      tokensDownload.downloadAsync(),
      dataDownload.downloadAsync()
    ]);

    // Extract espeak-ng-data
    await unzip(dataZipPath, dataDirPath);
    await FileSystem.deleteAsync(dataZipPath);

    return {
      modelPath,
      tokensPath,
      dataDirPath
    };
  } catch (error) {
    console.error('TTS Model download failed:', error);
    throw error;
  }
};
