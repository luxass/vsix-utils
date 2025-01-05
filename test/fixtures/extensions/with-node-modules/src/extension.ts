import { parse } from "@babel/core";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("Congratulations, your extension \"with-node-modules\" is now active!");

  const disposable = vscode.commands.registerCommand("with-node-modules-extension.helloWorld", () => {
    const code = "const a = 1; const b = 2; console.log(a + b);";

    const result = parse(code, {
      sourceType: "script",
    });

    console.log(result);

    vscode.window.showInformationMessage("Hello World from With Node Modules Extension!");
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
