// Audio utilities for processing PCM data

export function base64ToFloat32Array(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create a DataView to ensure we read 16-bit integers as Little Endian,
  // which is the standard for WAV/PCM from the API.
  const dataView = new DataView(bytes.buffer);
  const float32Array = new Float32Array(len / 2);
  
  for (let i = 0; i < float32Array.length; i++) {
    // getInt16(byteOffset, littleEndian)
    const int16 = dataView.getInt16(i * 2, true); 
    float32Array[i] = int16 / 32768.0;
  }
  
  return float32Array;
}

export function float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(i * 2, s, true); // little-endian
  }
  return buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}