import { CommandValidator, ValidateProps, Validator } from ".";

export default class ValidationRunner implements Validator {
  public async runValidations(props: ValidateProps): Promise<Boolean> {
    try {
      for (const validator of this.validators) {
        const isValid = await validator.validate(props);
        if (!isValid) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
  constructor(private readonly validators: CommandValidator[]) {
  }

}
