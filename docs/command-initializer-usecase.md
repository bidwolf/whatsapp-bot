# Command Initializer UseCase
## Data
- CommandRegistry: The registry that contains the command factories.
- GroupCommunicationSocket: The socket that the command uses to communicate with the group.
## Responsibilities

- Initialize a command

## UseCases

> ### UseCase 1: Initialize Command
> 1. The initializer receives a command name.
> 2. The initializer call the command registry to get a command factory by the command name.
> 3. The initializer uses the command factory to create  a command instance.
> 4. The initializer return the `command initialized`.

> ### UseCase 2: Factory not found
>
> 1. The initializer receives a command name.
> 2. The initializer call the command registry to get a command factory by the command name.
> 3. The command is not found on the command registry
> 4. Return `undefined`

> ### UseCase 3: Error while running the registry
>
> 1. The initializer receives a command name.
> 2. The initializer call the command registry to get a command factory by the command name.
> 3. The initializer throws a error
> 4. The error is handled on the initialization process, and logged, then return `undefined`.
