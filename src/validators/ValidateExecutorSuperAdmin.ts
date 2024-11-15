import { CommandValidator } from '.';
import ValidateExecutorPermission from './ValidateExecutorPermission';
export default class ValidateExecutorSuperAdmin extends ValidateExecutorPermission implements CommandValidator {
  constructor() {
    super('superadmin')
  }
}
