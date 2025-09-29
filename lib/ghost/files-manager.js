import { GoogleAIFileManager } from '@google/generative-ai/server';
import { GhostPipelineError } from '@/types/ghost';
import { createHash } from 'crypto';
// Persistent file cache (could be backed by Redis/database in production)
class PersistentFileCache {
    cache = new Map();
    get(key) {
        return this.cache.get(key);
    }
    set(key, file) {
        this.cache.set(key, file);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    values() {
        return Array.from(this.cache.values());
    }
    clear() {
        this.cache.clear();
    }
    // Get files by criteria
    getFilesBySession(sessionId) {
        return this.values().filter(file => file.sessionId === sessionId);
    }
    getFilesByRole(role) {
        return this.values().filter(file => file.role === role);
    }
    getExpiredFiles(maxAgeHours = 24) {
        const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
        return this.values().filter(file => {
            const createTime = new Date(file.createTime).getTime();
            return createTime < cutoffTime;
        });
    }
}
export class EnhancedFilesManager {
    fileManager;
    cache = new PersistentFileCache();
    constructor(apiKey) {
        this.fileManager = new GoogleAIFileManager(apiKey);
    }
    /**
     * Generate content hash for deduplication
     */
    generateContentHash(buffer) {
        return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
    }
    /**
     * Create cache key for file lookup
     */
    createCacheKey(contentHash, role, sessionId) {
        const sessionPart = sessionId ? `-${sessionId}` : '';
        return `${contentHash}-${role}${sessionPart}`;
    }
    /**
     * Upload file with enhanced metadata and deduplication
     */
    async uploadFile(buffer, options) {
        const { role, sessionId, mimeType, displayName, allowDuplicates = false } = options;
        // Generate content hash for deduplication
        const contentHash = this.generateContentHash(buffer);
        const cacheKey = this.createCacheKey(contentHash, role, allowDuplicates ? sessionId : undefined);
        // Check cache first (unless duplicates allowed)
        if (!allowDuplicates) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                console.log(`🎯 Using cached ${role} file: ${cached.name} (${Math.round(cached.sizeBytes / 1024)}KB)`);
                return cached;
            }
        }
        try {
            console.log(`📤 Uploading ${role} to Files API (${Math.round(buffer.length / 1024)}KB)...`);
            // Create temp file for upload
            const fileName = displayName || `ghost-${role}-${sessionId}-${Date.now()}.${mimeType.split('/')[1]}`;
            const tempFilePath = `/tmp/${fileName}`;
            const fs = await import('fs');
            await fs.promises.writeFile(tempFilePath, buffer);
            // Upload file
            const uploadResult = await this.fileManager.uploadFile(tempFilePath, {
                mimeType,
                displayName: fileName
            });
            // Clean up temp file
            await fs.promises.unlink(tempFilePath);
            // Create managed file object
            const managedFile = {
                uri: uploadResult.file.uri,
                name: uploadResult.file.name,
                displayName: uploadResult.file.displayName || fileName,
                mimeType: uploadResult.file.mimeType,
                sizeBytes: parseInt(uploadResult.file.sizeBytes || '0'),
                createTime: uploadResult.file.createTime || new Date().toISOString(),
                sessionId,
                role,
                contentHash
            };
            // Cache the result
            this.cache.set(cacheKey, managedFile);
            console.log(`✅ Uploaded to Files API: ${managedFile.name} (${Math.round(managedFile.sizeBytes / 1024)}KB)`);
            console.log(`📎 File URI: ${managedFile.uri}`);
            return managedFile;
        }
        catch (error) {
            throw new GhostPipelineError(`Failed to upload ${role} file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'FILE_UPLOAD_FAILED', 'rendering', error instanceof Error ? error : undefined);
        }
    }
    /**
     * List all uploaded files with filtering
     */
    async listFiles(options) {
        try {
            console.log('📋 Listing Files API uploads...');
            // Get remote files
            const remoteFiles = await this.fileManager.listFiles();
            // Sync cache with remote files
            await this.syncCacheWithRemote(remoteFiles.files || []);
            let files = this.cache.values();
            // Apply filters
            if (options?.sessionId) {
                files = files.filter(f => f.sessionId === options.sessionId);
            }
            if (options?.role) {
                files = files.filter(f => f.role === options.role);
            }
            if (options?.maxAgeHours) {
                const cutoff = Date.now() - (options.maxAgeHours * 60 * 60 * 1000);
                files = files.filter(f => new Date(f.createTime).getTime() > cutoff);
            }
            console.log(`📊 Found ${files.length} matching files`);
            return files;
        }
        catch (error) {
            throw new GhostPipelineError(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`, 'FILE_LIST_FAILED', 'rendering', error instanceof Error ? error : undefined);
        }
    }
    /**
     * Get file metadata
     */
    async getFile(fileUri) {
        try {
            // Extract file name from URI
            const fileName = fileUri.split('/').pop() || '';
            const remoteFile = await this.fileManager.getFile(fileName);
            // Find in cache by URI
            const cachedFile = this.cache.values().find(f => f.uri === fileUri);
            if (cachedFile) {
                return cachedFile;
            }
            // If not in cache but exists remotely, try to reconstruct
            if (remoteFile) {
                console.log(`📄 Retrieved file metadata: ${remoteFile.displayName}`);
                return {
                    uri: remoteFile.uri,
                    name: remoteFile.name,
                    displayName: remoteFile.displayName || fileName,
                    mimeType: remoteFile.mimeType,
                    sizeBytes: parseInt(remoteFile.sizeBytes || '0'),
                    createTime: remoteFile.createTime || new Date().toISOString(),
                    sessionId: 'unknown',
                    role: 'analysis',
                    contentHash: 'unknown'
                };
            }
            return null;
        }
        catch (error) {
            console.warn(`Failed to get file ${fileUri}:`, error);
            return null;
        }
    }
    /**
     * Delete file with cache cleanup
     */
    async deleteFile(fileUri) {
        try {
            // Extract file name from URI
            const fileName = fileUri.split('/').pop() || '';
            await this.fileManager.deleteFile(fileName);
            // Remove from cache
            const cacheKeys = this.cache.keys();
            for (const key of cacheKeys) {
                const file = this.cache.get(key);
                if (file?.uri === fileUri) {
                    this.cache.delete(key);
                    break;
                }
            }
            console.log(`🗑️ Deleted file: ${fileName}`);
            return true;
        }
        catch (error) {
            console.warn(`Failed to delete file ${fileUri}:`, error);
            return false;
        }
    }
    /**
     * Automated cleanup of old files
     */
    async cleanupOldFiles(maxAgeHours = 24) {
        console.log(`🧹 Starting cleanup of files older than ${maxAgeHours} hours...`);
        const expiredFiles = this.cache.getExpiredFiles(maxAgeHours);
        let deleted = 0;
        let errors = 0;
        for (const file of expiredFiles) {
            const success = await this.deleteFile(file.uri);
            if (success) {
                deleted++;
            }
            else {
                errors++;
            }
        }
        console.log(`✅ Cleanup completed: ${deleted} deleted, ${errors} errors`);
        return { deleted, errors };
    }
    /**
     * Cleanup files by session (useful after processing completion)
     */
    async cleanupSession(sessionId) {
        console.log(`🧹 Cleaning up session: ${sessionId}`);
        const sessionFiles = this.cache.getFilesBySession(sessionId);
        let deleted = 0;
        let errors = 0;
        for (const file of sessionFiles) {
            const success = await this.deleteFile(file.uri);
            if (success) {
                deleted++;
            }
            else {
                errors++;
            }
        }
        console.log(`✅ Session cleanup completed: ${deleted} deleted, ${errors} errors`);
        return { deleted, errors };
    }
    /**
     * Get storage usage statistics
     */
    getStorageStats() {
        const files = this.cache.values();
        const stats = {
            totalFiles: files.length,
            totalSizeKB: Math.round(files.reduce((sum, f) => sum + f.sizeBytes, 0) / 1024),
            filesByRole: {},
            oldestFile: '',
            newestFile: ''
        };
        // Count by role
        for (const file of files) {
            stats.filesByRole[file.role] = (stats.filesByRole[file.role] || 0) + 1;
        }
        // Find oldest and newest
        if (files.length > 0) {
            const sorted = files.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
            stats.oldestFile = sorted[0].displayName;
            stats.newestFile = sorted[sorted.length - 1].displayName;
        }
        return stats;
    }
    /**
     * Sync cache with remote files (for cache consistency)
     */
    async syncCacheWithRemote(remoteFiles) {
        // This is a basic sync - in production you might want more sophisticated logic
        const remoteUris = new Set(remoteFiles.map(f => f.uri));
        // Remove cached files that no longer exist remotely
        const cacheKeys = this.cache.keys();
        for (const key of cacheKeys) {
            const file = this.cache.get(key);
            if (file && !remoteUris.has(file.uri)) {
                this.cache.delete(key);
                console.log(`🔄 Removed stale cache entry: ${file.displayName}`);
            }
        }
    }
}
// Export singleton instance
let filesManager = null;
export function configureFilesManager(apiKey) {
    filesManager = new EnhancedFilesManager(apiKey);
}
export function getFilesManager() {
    if (!filesManager) {
        throw new GhostPipelineError('Files manager not configured. Call configureFilesManager first.', 'CLIENT_NOT_CONFIGURED', 'rendering');
    }
    return filesManager;
}
