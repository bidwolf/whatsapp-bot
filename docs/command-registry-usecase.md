# Registry command UseCase

## Data
- Factory list: List of factory functions that creates a command.
- GroupCommunicationSocket: The socket that the command uses to communicate with the group. 
## Responsibilities
- Register factories
- Get a factory by name

## UseCases
> ### UseCase 1: Register Factory Command
> 1. The registry receives a list of factory function that creates a command.
> 2. The factory is registered in the list of available factory commands.

> ### UseCase 2: Get Factory Command by Name
> 1. The registry receives a command name.
> 2. The registry search for the command factory that matches the command name.
> 3. The factory is returned.

> ### UseCase 3: Factory Command not found
> 1. The registry receives a command name.
> 2. The registry search for the command factory that matches the command name.
> 3. The factory is not found.
> 4. The registry returns undefined.

