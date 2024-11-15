import { CommandValidator, ValidateProps } from ".";
import { Method } from "../utils/commands";

export default class ValidateMethods implements CommandValidator {
  async validate({ method }: ValidateProps): Promise<Boolean> {
    return method ? this.allowedMethods.includes(method) : false
  }
  constructor(private readonly allowedMethods: Method[]) { }
}
