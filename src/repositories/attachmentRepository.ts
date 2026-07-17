import { get, set, del, clear } from 'idb-keyval';

export const attachmentRepository = {
  async getAttachment(transactionId: string): Promise<string | undefined> {
    try {
      const val = await get(`attachment_${transactionId}`);
      return val || undefined;
    } catch (error) {
      console.error('[AttachmentRepository] Error getting attachment:', error);
      return undefined;
    }
  },

  async saveAttachment(transactionId: string, attachmentUrl: string): Promise<void> {
    try {
      await set(`attachment_${transactionId}`, attachmentUrl);
    } catch (error) {
      console.error('[AttachmentRepository] Error saving attachment:', error);
    }
  },

  async deleteAttachment(transactionId: string): Promise<void> {
    try {
      await del(`attachment_${transactionId}`);
    } catch (error) {
      console.error('[AttachmentRepository] Error deleting attachment:', error);
    }
  },

  async clearAllAttachments(): Promise<void> {
    try {
      await clear();
    } catch (error) {
      console.error('[AttachmentRepository] Error clearing attachments:', error);
    }
  }
};
