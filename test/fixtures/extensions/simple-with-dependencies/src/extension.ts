import type { ExtensionContext } from "vscode";
import { commands, window } from "vscode"
import { load } from "js-yaml";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("simple-with-dependencies-extension.build", () => {
      // open a terminal
      const terminal = window.createTerminal("Bundle Extension");

      // run a shell command
      terminal.sendText("echo 'Building...'");

      // show the terminal
      terminal.show();
    }),
    commands.registerCommand("simple-with-dependencies-extension.parse-yaml", () => {
      const yaml = `
        name: John Doe
        age: 30
      `;

      try {
        const data = load(yaml);
        window.showInformationMessage(JSON.stringify(data, null, 2));
      } catch (error) {
        window.showErrorMessage("failed to parse yaml!");
      }
    })
  );
}

export function deactivate() { }
