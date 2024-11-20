import { IMessage } from '../messages';
import ValidateExecutorPermission from './ValidateExecutorPermission';
export default class ValidateExecutorAdmin<ISocketMessage extends IMessage> extends ValidateExecutorPermission<ISocketMessage> {
  constructor() {
    super('admin')
  }
}
