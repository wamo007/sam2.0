import RNFS from "react-native-fs";
import * as FileSystem from "expo-file-system";
import { unzip } from "react-native-zip-archive";

export const downloadSTTModel = async (
  // modelName: string,
  // modelUrl: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  
  const destPathSTT = `${FileSystem.documentDirectory}ggml-base.en.bin`;
  // const modelsPath = `${FileSystem.documentDirectory}models`
  try {
    const fileInfo = await FileSystem.getInfoAsync(destPathSTT);

    // If it exists, delete it
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(destPathSTT);
      console.log(`Deleted existing file at ${destPathSTT}`);
    }
    // console.log("right before download")
    // console.log("modelUrl : ", modelUrl)

    const downloadResumable = FileSystem.createDownloadResumable(
      `https://huggingface.co/shamil010/mymodel/resolve/main/ggml-base.bin`,
      destPathSTT,
      {},
      (downloadProgress) => {
        const progress = 
          (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
        onProgress(Math.floor(progress));
      }
    );
  
    const downloadResult = await downloadResumable.downloadAsync();

    // await unzip(destPathSTT, modelsPath);
    // await RNFS.unlink(destPathSTT);
      
    if (downloadResult?.uri) {
      return destPathSTT;
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