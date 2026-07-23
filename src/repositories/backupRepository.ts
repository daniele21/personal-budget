import {
  pushBackup,
  pullBackup,
  pullBackupVersion,
  listBackupVersions,
  deleteBackup,
  BackupPayload,
} from '../lib/backup';

export const backupRepository = {
  async pushBackup(uid: string, data: BackupPayload): Promise<boolean> {
    return pushBackup(uid, data);
  },

  async pullBackup(uid: string): Promise<BackupPayload | null> {
    return pullBackup(uid);
  },

  async pullBackupVersion(uid: string, versionId: string): Promise<BackupPayload | null> {
    return pullBackupVersion(uid, versionId);
  },

  async listBackupVersions(uid: string) {
    return listBackupVersions(uid);
  },

  async deleteBackup(uid: string): Promise<boolean> {
    return deleteBackup(uid);
  }
};
