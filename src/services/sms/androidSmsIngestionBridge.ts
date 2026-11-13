import type { ISmsIngestionBridge } from '../interfaces';

/**
 * Android SMS adapter stub.
 * Does not declare READ_SMS / RECEIVE_SMS. Opt-in ingestion ships after Play review.
 */
export class AndroidSmsIngestionBridge implements ISmsIngestionBridge {
  isSupported(): boolean {
    return true;
  }

  async hasPermission(): Promise<boolean> {
    return false;
  }

  async requestPermission(): Promise<boolean> {
    return false;
  }

  getArchitectureNotice(): string {
    return 'SMS inbox reading is prepared for Android but disabled until Google Play permission review. Paste a bank SMS below to preview parsing; only structured FinanceTransaction records are stored.';
  }
}
