export {};
declare global {
  interface Window {
    osuMaps: {
      status(): Promise<any>;
      sync(options: any): Promise<any>;
      selectLibrary(): Promise<string | null>;
      connectRepository(options: any): Promise<string>;
      restore(options: any): Promise<any>;
      cancel(): Promise<boolean>;
      onProgress(callback: (value: any) => void): () => void;
    };
  }
}
