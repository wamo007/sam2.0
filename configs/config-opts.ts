import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system';

const getCoreMLModelAsset = () =>
  Platform.OS === 'ios'
    ? {
        filename: 'ggml-base.en-encoder.mlmodelc',
        assets: [
          `${FileSystem.documentDirectory}ggml-base.en-encoder.mlmodelc/weights/weight.bin`,
          `${FileSystem.documentDirectory}ggml-base.en-encoder.mlmodelc/model.mil`,
          `${FileSystem.documentDirectory}ggml-base.en-encoder.mlmodelc/coremldata.bin`,
        ],
      }
    : undefined

export default {
  useGpu: false, // Enable Metal (Will skip Core ML if enabled)
  useFlashAttn: true,

  useCoreMLIos: true,
  coreMLModelAsset: getCoreMLModelAsset(),
}