import { CommandValidator } from '.';
import ValidatePermission from './ValidatePermission';
export default class ValidateSuperAdmin extends ValidatePermission implements CommandValidator {
  constructor() {
    super('superadmin')
  }
}
