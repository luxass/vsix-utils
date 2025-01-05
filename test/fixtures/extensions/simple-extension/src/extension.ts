import type { ExtensionContext } from "vscode";
import { commands, window } from "vscode"

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("simple-extension.build", () => {
      // open a terminal
      const terminal = window.createTerminal("Simple Extension");

      // run a shell command
      terminal.sendText("echo 'Building...'");

      // show the terminal
      terminal.show();
    })
  );
}

export function deactivate() { }
