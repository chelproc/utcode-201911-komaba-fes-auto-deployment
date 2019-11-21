import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as puppeteer from "puppeteer-core";
import * as open from "open";
import * as fsExtra from "fs-extra";
import * as zipAFolder from "zip-a-folder";
import * as extractZip from "extract-zip"

export function activate(context: vscode.ExtensionContext) {
	const statusBarItem1 = vscode.window.createStatusBarItem();
	const disposable1 = vscode.commands.registerCommand("utcode.workshop.komaba-fes2019.deploy", async () => {
		statusBarItem1.hide();
		await deploy();
		statusBarItem1.show();
	});
	context.subscriptions.push(disposable1);
	statusBarItem1.text = "Webに公開";
	statusBarItem1.command = "utcode.workshop.komaba-fes2019.deploy";
	statusBarItem1.show();

	const statusBarItem2 = vscode.window.createStatusBarItem();
	const disposable2 = vscode.commands.registerCommand("utcode.workshop.komaba-fes2019.template", template);
	context.subscriptions.push(disposable2);
	statusBarItem2.text = "テンプレート";
	statusBarItem2.command = "utcode.workshop.komaba-fes2019.template";
	statusBarItem2.show();

	const statusBarItem3 = vscode.window.createStatusBarItem();
	statusBarItem3.text = "実行";
	statusBarItem3.command = "extension.liveServer.goOnline";
	statusBarItem3.show();
}


async function deploy() {
	if (!vscode.workspace.workspaceFolders) {
		vscode.window.showInformationMessage("ワークスペースが開かれていません。");
		return;
	}
	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Webサイトを公開しています...",
		cancellable: false
	}, async () => {
		const chromeExcutablePath = vscode.workspace.getConfiguration("utcode").googleChromeExcutablePath;
		const workspaceDir = vscode.workspace.workspaceFolders![0].uri.fsPath;
		const tempDir = path.join(os.tmpdir(), `utcode-komaba-fes${Date.now()}${Math.floor(Math.random() * 10000)}`);
		const tempZipPath = tempDir + ".zip";
		await fsExtra.copy(workspaceDir, tempDir);
		await Promise.all(["node_modules", ".vscode"].map(item => fsExtra.remove(path.join(tempDir, item))));
		await zipAFolder.zip(tempDir, tempZipPath);

		const browser = await puppeteer.launch({
			headless: true,
			executablePath: chromeExcutablePath
		});
		const page = (await browser.pages())[0];
		await page.goto("https://app.netlify.com/drop/");

		await page.evaluate(`
			document.body.appendChild(Object.assign(
				document.createElement("input"),
				{
					id: "some-unique-identifier",
					type: "file",
					onchange: e => {
						// Do not use DragEvent instead of Event.
						// DragEvent has native dataTransfer property, which cannot be created by scripts.
						document.querySelector(".dropzone").dispatchEvent(Object.assign(
							new Event("drop"),
							{ dataTransfer: { files: e.target.files } }
						));
					}
				}
			));
		`);

		const fileInput = await page.$("#some-unique-identifier");
		if (fileInput) await fileInput.uploadFile(tempZipPath);

		const anchorElement = await page.waitForSelector("a.action-link.inline.break-all[rel='noopener noreferrer']", {
			visible: true
		});
		const url = await (await anchorElement.getProperty("href")).jsonValue() as string;
		vscode.window.showInformationMessage(url);

		const siteIdentifiers = url.match(/^http:\/\/([a-zA-Z\d\-]+)\.netlify\.com\/$/);
		if (siteIdentifiers) {
			open("https://dreamy-allen-26c3c2.netlify.com/?" + encodeURIComponent(siteIdentifiers[1]));
		}

		browser.close();
	});
}

async function template() {
	if (!vscode.workspace.workspaceFolders) {
		vscode.window.showInformationMessage("ワークスペースが開かれていません。");
		return;
	}
	if (await vscode.window.showInformationMessage("この操作を実行すると、編集されたデータがすべて削除されます。本当によろしいですか？", "はい", "いいえ") === "はい") {
		const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
		const templatePath = vscode.workspace.getConfiguration("utcode").templatePath;
		const templates = await fsExtra.readdir(templatePath);
		const templateName = await vscode.window.showQuickPick(templates.map(template => template.substr(0, template.length - 4) /* trim .zip */));

		const workspaceEntities = await fsExtra.readdir(workspacePath);
		await Promise.all(workspaceEntities.map(entity => fsExtra.remove(path.join(workspacePath, entity))));
		extractZip(path.join(templatePath, templateName + ".zip"), {
			dir: workspacePath
		}, () => {});
	}
}

export function deactivate() {}
