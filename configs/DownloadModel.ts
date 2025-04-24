import RNFS from "react-native-fs";

export const downloadModel = async (
  // modelName: string,
  // modelUrl: string,
  language: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  
  let model;
  if (language === 'ru') {
    model = 'Vikhr-Qwen-2.5-1.5b-Instruct-Q3_K_S.gguf';
  } else if (language === 'uk' || language === 'us') {
    model = 'Llama-3.2-1B-Instruct-Q4_0.gguf';
  }

  const destPath = `${RNFS.DocumentDirectoryPath}/Llama-3.2-1B-Instruct-Q4_0.gguf`;
  try {
    const fileExists = await RNFS.exists(destPath);

    // If it exists, delete it
    if (fileExists) {
      await RNFS.unlink(destPath);
      console.log(`Deleted existing file at ${destPath}`);
    }
    // console.log("right before download")
    // console.log("modelUrl : ", modelUrl)

    const downloadResult = await RNFS.downloadFile({
      fromUrl: `https://huggingface.co/shamil010/mymodel/resolve/main/${model}`,
      toFile: destPath,
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
    // console.log("right after download")

    if (downloadResult.statusCode === 200) {
      return destPath;
    } else {
      throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download model: ${error.message}`);
    } else {
      throw new Error('Failed to download model: Unknown error');
    }
  }
};