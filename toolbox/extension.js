// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Estensione attiva!!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('toolbox.start', async () => {
		// The code you place here will be executed every time your command is executed

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Apri una cartella per cominciare così potrai conservare il codice che produrrai durante la partita.');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const filePath = path.join(workspacePath, 'sandbox.c');

        // Crea il file .c se non esiste
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '');
            console.log('file creato')
        }
        console.log('file created because not loaded before')
        let document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        await vscode.window.showTextDocument(document, vscode.ViewColumn.Two);

		// Display a message box to the user
		vscode.window.showInformationMessage('Benvenuto in Linus e le informatiche avventure!');
        
		var panel = vscode.window.createWebviewPanel(
			'toolbox',
			'Le avventure informatiche di Linus!',
			vscode.ViewColumn.One,
			{
                enableScripts:true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
            }
		);
        panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.interaction === 1) {
                    try {
                        // Usa il primo editor aperto (puoi cambiare la logica se hai altri requisiti)
                        const editors = vscode.window.visibleTextEditors;
                        if (editors.length === 0) {
                            console.log('No visible editors found'); // Debug logging
                            panel.webview.postMessage({ command: 'error', message: 'No visible editors' });
                            vscode.window.showErrorMessage('No visible editors found. Please open a file and try again.');
                            return;
                        }

                        const activeEditor = editors[0]; // Usa il primo editor aperto
                        console.log('Using editor:', activeEditor); // Debug logging 
                        const uri = activeEditor.document.uri;
                        console.log('Editor URI:', uri); // Debug logging
                        const content = await readFileContent(uri);
                        console.log('File content read:', content); // Debug logging
                        panel.webview.postMessage({ command: 'setContent', content: content, isDirty: activeEditor.document.isDirty });
                    } catch (error) {
                        console.error('Error reading file content:', error);
                        panel.webview.postMessage({ command: 'error', message: 'Error reading file content' });
                    }
                }
                else{
                    panel.webview.postMessage({ command: 'setContent', message: 'nothing to post this time' });
                }
            },
            undefined,
            context.subscriptions
        );
		panel.webview.html = getQuestContent(context, panel);
        
	});
	context.subscriptions.push(disposable);
}

async function readFileContent(uri) {
    return new Promise((resolve, reject) => {
        fs.readFile(vscode.Uri.parse(uri).fsPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file content:', err);
                return reject(err);
            }
            resolve(data);
        });
    });
}

function fileSaved(){

}

function getQuestContent(context, panel) {
    var quests = [
        {
            pg: "Ritchie",
            line: "Quello che è successo a te è già successo ad un altro ragazzo. È stato lui a darmi questo nome. Il suo nome.\nPer tornare a casa lui suonò la campana del vecchio campanile nella Valle delle Variabili. Molte peripezie ti attenderanno!",
            interaction: 0,
        },
        {
            pg: "Linus",
            line: "Devo tornare a casa prima delle 14!",
            interaction: 0,
        },
        {
            pg: "Ritchie",
            line: "Prima di partire dovrai equipaggiare un'arma, una difesa e una magia." +
            "\nA CodeLand ogni elemento è contenuto in una scatola detta variabile con un nome e un tipo. Il tipo serve a specificare che tipo di dato può contenere la varibile ossia il valore!" +
            "Indica, usando la legenda, per ogni categoria l’intero associato all’oggetto che intendi equipaggiare. Io dichiaro di fare uso della magia in questo modo: “int magia;”. Adesso prova tu! ",
            interaction: 1,
        },
        {
            pg: "Ritchie",
            line: "Adesso inizializzo la mia magia con Palla Di Fuoco in questo modo: magia = 1. Adesso scegli la tua dalla legenda",
            interaction:1,
        }
    ];

    // Ottieni il percorso assoluto della cartella imgs
    const mediaPath = context.asAbsolutePath('imgs');
    // Crea URI per le immagini
    const questsWithImgSrc = quests.map(quest => {
        const imgUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `${quest.pg}.jpg`)));
        return { ...quest, imgSrc: imgUri.toString() };
    });
    const bgUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `bg.jpg`)));

    const regexQuest2 = /^int\s+magia\s*=\s*[1-5]\s*;\s*int\s+arma\s*=\s*[1-5]\s*;\s*int\s+difesa\s*=\s*[1-5]\s*;\s*$/ms;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gioca!</title>
        <script>
            const vscode = acquireVsCodeApi();
            let currentIndex = 0;
            const quests = ${JSON.stringify(questsWithImgSrc)};

            function errorDetected(message){
                const baloon = document.getElementById('baloon');
                const pgImg = document.getElementById('pgImg');
                baloon.innerHTML = \`<p>\${message}</p>\`;
            }

            function updateContent(index) {
                const baloon = document.getElementById('baloon');
                const pgImg = document.getElementById('pgImg');
                pgImg.src = quests[index].imgSrc;
                baloon.innerHTML = \`<p>\${quests[index].pg}: \${quests[index].line}</p>\`;
                baloon.style.height = '100px';
                
                if(index%2 != 0){
                    pgImg.style.float = 'left'; 
                }
                else {
                    pgImg.style.float = 'right'; 
                }
                
                
            }

            
    

            document.addEventListener('DOMContentLoaded', function() {
                updateContent(currentIndex);
                
                document.getElementById('avanti').addEventListener('click', () => {
                    vscode.postMessage({interaction: quests[currentIndex].interaction });
                });
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (currentIndex < quests.length - 1) {
                        if(currentIndex == 2){
                            if(message.isDirty){
                                errorDetected('Salva prima il file! Ti basta premere Ctrl + Sdcdcds')
                            }
                            else{
                                const regexQuest2 = ${regexQuest2};
                                content = message.content
                                console.log('contenuto: '+content);
                                
                                if (regexQuest2.test(content)){
                                    currentIndex++;
                                    updateContent(currentIndex);
                                }
                                else{
                                    errorDetected("C'è un errore Linus. Riprova!");  
                                }
                            }
                        }
                        else{
                            currentIndex++;
                            updateContent(currentIndex);
                        }
                        
                    }
                });

                document.getElementById('indietro').addEventListener('click', function() {
                    if (currentIndex > 0) {
                        currentIndex--;
                        updateContent(currentIndex);
                    }
                });
            });
        </script>

        <style>

            body{
                margin: 50px;
                background-repeat: no-repeat;
                background-image: url('${bgUri}');
                background-size: cover;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            #pgCont{
                margin-bottom: 30px;
            }

            #baloon{
                color: #000000;
                background-color: #EFCA08;
                border-radius: 15px;
                padding: 20px;
            }

            #dashboard{
                display: flex;
                flex-direction: row;
                justify-content: space-evenly;
            }
            #dashboard input{
                height: 60px;
                width: 100px;
            }

        </style>

    </head>
    <body>
        <div id="pgCont">
            <div id="baloon"></div>
            <img id="pgImg" alt="Personaggio"/>
        </div>
        <div id = "dashboard">
            <input type="button" id="indietro" value="Indietro"/>
            <input type="button" id="avanti" value="Avanti"/>
        </div>
    </body>

    <script>
        const pgImg = document.getElementById('pgImg');
        pgImg.style.width = '500px';
        pgImg.style.height = '400px';
    </script>
    </html>`;
}


// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
