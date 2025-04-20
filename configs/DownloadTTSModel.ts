import RNFS from "react-native-fs";
import { unzip } from "react-native-zip-archive";

export const downloadTTSModel = async (
  // modelName: string,
  // modelUrl: string,
  voice: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  
  const destPathTTS = `${RNFS.DocumentDirectoryPath}/models-${voice}-tts.zip`;
  try {
    const fileExists = await RNFS.exists(destPathTTS);

    // If it exists, delete it
    if (fileExists) {
      await RNFS.unlink(destPathTTS);
      console.log(`Deleted existing file at ${destPathTTS}`);
    }
    // console.log("right before download")
    // console.log("modelUrl : ", modelUrl)

    const downloadResult = await RNFS.downloadFile({
      fromUrl: `https://huggingface.co/shamil010/mymodel/resolve/main/models-${voice}-tts.zip`,
      toFile: destPathTTS,
      progressDivider: 5,
      begin: (res) => {
        // console.log("Response begin ===\n\n");
        console.log(res);
      },
      progress: ({ bytesWritten, contentLength }: { bytesWritten: number; contentLength: number }) => {
        // console.log("Response written ===\n\n");
        const progress = (bytesWritten / contentLength) * 100;
        // console.log("progress : ",progress)
        onProgress(Math.floor(progress));
      },
    }).promise;
    await unzip(destPathTTS, `${RNFS.DocumentDirectoryPath}/models`);
    await RNFS.unlink(destPathTTS);
      
    if (downloadResult.statusCode === 200) {
      return destPathTTS;
    } else {
      throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download the voice model: ${error.message}`);
    } else {
      throw new Error('Failed to download the voice model: Unknown error');
    }
  }
};