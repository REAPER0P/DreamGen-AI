export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
export type Resolution = '1K' | '2K' | '4K';

export interface StylePreset {
  id: string;
  name: string;
  promptSuffix: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'none', name: 'None', promptSuffix: '' },
  { id: 'photo', name: 'Realistic Photo', promptSuffix: 'highly detailed, 8k, photorealistic, professional photography, sharp focus, f/1.8' },
  { id: 'anime', name: 'Anime', promptSuffix: 'stylized anime art, vibrant colors, clean lineart, digital illustration, cel shaded' },
  { id: 'cinematic', name: 'Cinematic', promptSuffix: 'epic cinematic shot, movie still, dramatic lighting, volumetric fog, anamorphic' },
  { id: '3d', name: '3D Render', promptSuffix: 'unreal engine 5, octane render, raytraced, 4k, hyper-detailed, masterpiece' },
  { id: 'oil', name: 'Oil Painting', promptSuffix: 'thick brush strokes, impasto technique, canvas texture, classical art style' },
  { id: 'watercolor', name: 'Watercolor', promptSuffix: 'soft watercolor bleeds, elegant paint splashes, traditional paper texture' },
  { id: 'cyberpunk', name: 'Cyberpunk', promptSuffix: 'neon lights, futuristic technology, rainy night street, gritty atmosphere' },
];

export const MOODS = ['Default', 'Vibrant', 'Dark', 'Soft', 'Dramatic', 'Ethereal', 'Gritty', 'Surreal'];
export const LIGHTING = ['Default', 'Studio', 'Natural', 'Sunset', 'Neon', 'God Rays', 'Muted', 'Backlit'];
export const COLOR_TONES = ['Default', 'Warm', 'Cool', 'Pastel', 'Monochrome', 'Vintage', 'High Saturation'];

export const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' as AspectRatio },
  { label: '4:3', value: '4:3' as AspectRatio },
  { label: '3:4', value: '3:4' as AspectRatio },
  { label: '16:9', value: '16:9' as AspectRatio },
  { label: '9:16', value: '9:16' as AspectRatio },
];
