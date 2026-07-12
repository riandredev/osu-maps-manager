export {};
declare global {
  interface Window {
    osuMaps: {
      status(): Promise<any>;
      sync(push: boolean): Promise<any>;
      restore(options: any): Promise<any>;
      cancel(): Promise<boolean>;
      onProgress(callback: (value: any) => void): () => void;
    };
  }
}
