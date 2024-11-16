import { CommandValidator, ValidateProps } from ".";
import { Method } from "../utils/commands";

export default class ValidateMethods implements CommandValidator {
  async validate({ method }: ValidateProps): Promise<Boolean> {
    const isValid = method ? this.allowedMethods.includes(method) : false
    return isValid
  }
  constructor(private readonly allowedMethods: Method[]) { }
}
