import { CommandValidator } from '.';
import ValidatePermission from './ValidatePermission';
export default class ValidateAdmin extends ValidatePermission implements CommandValidator {
  constructor() {
    super('admin')
  }
}
