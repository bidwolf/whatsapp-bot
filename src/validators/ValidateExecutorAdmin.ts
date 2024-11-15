import { CommandValidator } from '.';
import ValidateExecutorPermission from './ValidateExecutorPermission';
export default class ValidateExecutorAdmin extends ValidateExecutorPermission implements CommandValidator {
  constructor() {
    super('admin')
  }
}
