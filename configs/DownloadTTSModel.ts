import RNFS from "react-native-fs";
import * as FileSystem from "expo-file-system";
import { unzip } from "react-native-zip-archive";

export const downloadTTSModel = async (
  // modelName: string,
  // modelUrl: string,
  gender: string,
  lang: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  
  const destPathTTS = `${FileSystem.documentDirectory}models-${gender}-${lang}-tts.zip`;
  const modelsPath = `${FileSystem.documentDirectory}models`
  try {
    const fileInfo = await FileSystem.getInfoAsync(modelsPath);

    // If it exists, delete it
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(modelsPath);
      console.log(`Deleted existing file at ${modelsPath}`);
    }
    // console.log("right before download")
    // console.log("modelUrl : ", modelUrl)

    const downloadResumable = FileSystem.createDownloadResumable(
      `https://huggingface.co/shamil010/mymodel/resolve/main/models-${gender}-${lang}-tts.zip`,
      destPathTTS,
      {},
      (downloadProgress) => {
        const progress = 
          (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
        onProgress(Math.floor(progress));
      }
    );
  
    const downloadResult = await downloadResumable.downloadAsync();

    await unzip(destPathTTS, modelsPath);
    await RNFS.unlink(destPathTTS);
      
    if (downloadResult?.uri) {
      return destPathTTS;
    } else {
      throw new Error(`Download failed: No TTS model returned`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download the voice model: ${error.message}`);
    } else {
      throw new Error('Failed to download the voice model: Unknown error');
    }
  }
};