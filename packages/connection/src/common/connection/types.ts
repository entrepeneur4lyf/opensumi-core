import { IDisposable } from '@opensumi/ide-core-common';

export interface IConnectionShape<T> {
  send(data: T): void;
  onMessage: (cb: (data: T) => void) => IDisposable;
  onClose: (cb: () => void) => IDisposable;
}
