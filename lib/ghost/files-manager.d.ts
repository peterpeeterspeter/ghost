export interface ManagedFile {
    uri: string;
    name: string;
    displayName: string;
    mimeType: string;
    sizeBytes: number;
    createTime: string;
    sessionId: string;
    role: 'flatlay' | 'reference' | 'analysis';
    contentHash: string;
}
export type FileLifecycle = 'uploaded' | 'processing' | 'completed' | 'expired';
export declare class EnhancedFilesManager {
    private fileManager;
    private cache;
    constructor(apiKey: string);
    /**
     * Generate content hash for deduplication
     */
    private generateContentHash;
    /**
     * Create cache key for file lookup
     */
    private createCacheKey;
    /**
     * Upload file with enhanced metadata and deduplication
     */
    uploadFile(buffer: Buffer, options: {
        role: 'flatlay' | 'reference' | 'analysis';
        sessionId: string;
        mimeType: string;
        displayName?: string;
        allowDuplicates?: boolean;
    }): Promise<ManagedFile>;
    /**
     * List all uploaded files with filtering
     */
    listFiles(options?: {
        sessionId?: string;
        role?: string;
        maxAgeHours?: number;
    }): Promise<ManagedFile[]>;
    /**
     * Get file metadata
     */
    getFile(fileUri: string): Promise<ManagedFile | null>;
    /**
     * Delete file with cache cleanup
     */
    deleteFile(fileUri: string): Promise<boolean>;
    /**
     * Automated cleanup of old files
     */
    cleanupOldFiles(maxAgeHours?: number): Promise<{
        deleted: number;
        errors: number;
    }>;
    /**
     * Cleanup files by session (useful after processing completion)
     */
    cleanupSession(sessionId: string): Promise<{
        deleted: number;
        errors: number;
    }>;
    /**
     * Get storage usage statistics
     */
    getStorageStats(): {
        totalFiles: number;
        totalSizeKB: number;
        filesByRole: Record<string, number>;
        oldestFile: string;
        newestFile: string;
    };
    /**
     * Sync cache with remote files (for cache consistency)
     */
    private syncCacheWithRemote;
}
export declare function configureFilesManager(apiKey: string): void;
export declare function getFilesManager(): EnhancedFilesManager;
