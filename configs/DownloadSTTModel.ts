import RNFS from "react-native-fs";
import * as FileSystem from "expo-file-system";
import { unzip } from "react-native-zip-archive";
import { Platform } from "react-native";

export const downloadSTTModel = async (
  // modelName: string,
  // modelUrl: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  const baseDir = FileSystem.documentDirectory!;
  const destPathSTT = `${FileSystem.documentDirectory}ggml-base-q8_0.bin`;
  const destPathSTTEncoder = `${FileSystem.documentDirectory}ggml-base-encoder.mlmodelc`;
  const destPathSTTEncoderZip = `${FileSystem.documentDirectory}ggml-base-encoder.mlmodelc.zip`;
  // const modelsPath = `${FileSystem.documentDirectory}models`
  try {
    const fileInfo = await FileSystem.readDirectoryAsync(baseDir);
    const mlModelInfo = await FileSystem.getInfoAsync(destPathSTTEncoder);

    // If it exists, delete it
    for (const file of fileInfo) {
      if (file.endsWith('.bin')) {
        await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`);
        console.log(`Deleted existing .bin file: ${file}`);
      }
    }

    if (Platform.OS === 'ios' && mlModelInfo.exists) {
      await FileSystem.deleteAsync(destPathSTTEncoder);
      console.log(`Deleted existing file at ${destPathSTTEncoder}`);
    }
    // console.log("right before download")
    // console.log("modelUrl : ", modelUrl)

    const downloadResumable = FileSystem.createDownloadResumable(
      `https://huggingface.co/shamil010/mymodel/resolve/main/ggml-base-q8_0.bin`,
      destPathSTT,
      {},
      (downloadProgress) => {
        const progress = 
          (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
        onProgress(Math.floor(progress));
      }
    );
  
    const downloadResult = await downloadResumable.downloadAsync();
    
    const downloadResumableEncoder = FileSystem.createDownloadResumable(
      `https://huggingface.co/shamil010/mymodel/resolve/main/ggml-base-encoder.mlmodelc.zip`,
      destPathSTTEncoderZip,
      {},
      (downloadProgress) => {
        const progress = 
          (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
        onProgress(Math.floor(progress));
      }
    );
  
    const downloadResultEncoder = await downloadResumableEncoder.downloadAsync();

    
    
    if (Platform.OS === 'ios') {
      if (downloadResultEncoder?.uri) {
        await unzip(destPathSTTEncoderZip, destPathSTTEncoder);
        await RNFS.unlink(destPathSTTEncoderZip);

        destPathSTTEncoderZip
      } else {
        throw new Error(`Download failed: No TTS coreml model returned`);
      }
    }

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