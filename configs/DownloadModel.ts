import * as FileSystem from 'expo-file-system';

export const downloadModel = async (
  language: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  let model;
  if (language === 'ru') {
    model = 'Vikhr-Qwen-2.5-1.5b-Instruct-Q3_K_S.gguf';
  } else if (language === 'uk' || language === 'us') {
    model = 'Llama-3.2-1B-Instruct-Q4_0.gguf';
  }

  const destPath = `${FileSystem.documentDirectory}${model}`;
  
  try {
    const fileInfo = await FileSystem.getInfoAsync(destPath);

    // If file exists, delete it
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(destPath);
      console.log(`Deleted existing file at ${destPath}`);
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      `https://huggingface.co/shamil010/mymodel/resolve/main/${model}`,
      destPath,
      {},
      (downloadProgress) => {
        const progress = 
          (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
        onProgress(Math.floor(progress));
      }
    );

    const downloadResult = await downloadResumable.downloadAsync();
    
    if (downloadResult?.uri) {
      return destPath;
    } else {
      throw new Error('Download failed: No URI returned');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download model: ${error.message}`);
    } else {
      throw new Error('Failed to download model: Unknown error');
    }
  }
};