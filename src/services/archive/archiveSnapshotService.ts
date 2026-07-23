import type { AppData } from '../../data/model';
import {
  validateAppData,
  type PortableSnapshot,
} from '../../domain/archive';
import { attachmentRepository } from '../../repositories/attachmentRepository';
import { portablePreferencesRepository } from '../../repositories/portablePreferencesRepository';

export const archiveSnapshotService = {
  async collect(data: AppData): Promise<PortableSnapshot> {
    const validatedData = validateAppData(data);
    const preferences = portablePreferencesRepository.load();
    const inventory = await attachmentRepository.listAttachments(validatedData.value.transactions);

    return {
      data: validatedData.value,
      preferences,
      attachments: inventory.attachments,
      warnings: [...validatedData.warnings, ...inventory.warnings],
    };
  },
};
