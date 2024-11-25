# Dispatch command UseCase

## Responsibilities

- Dispatch commands

## UseCases
> ### UseCase 2: Primary Flow
>
>1. The dispatcher receives a message that is a command.
>2. The dispatcher uses a initializer to create a command instance by command name.
>3. The dispatcher run the command.

>### Alternative Flow: Command execution error
>
>1. The dispatcher receives a message that is a command.
>2. The dispatcher uses a initializer to create a command instance by command name.
>3. The dispatcher run the command.
>4. The command execution fails.
>5. The dispatcher log a error message that says that something went wrong during the command execution.

## Diagram

<img src='/docs/dispatch-command.drawio.svg' alt="dispatch command diagram">
