// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

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
        }
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

        const configFilePath = path.join(workspacePath, '.config.json');
        const settingsFilePath = path.join(workspacePath, '.vscode/settings.json');
        const vscodeFolderPath = path.join(workspacePath, '.vscode');
        let uniqueId = 0;
        try {
            // Crea la cartella .vscode se non esiste
            if (!fs.existsSync(vscodeFolderPath)) {
                fs.mkdirSync(vscodeFolderPath);
                console.log('.vscode directory created');
            }
    
            // Crea o aggiorna il file settings.json per escludere .config.json e se stesso dal File Explorer
            createOrUpdateSettingsFile(settingsFilePath);
    
            // Crea il file di configurazione con un ID unico se non esiste
            if (!fs.existsSync(configFilePath)) {
                uniqueId = generateUniqueId();
                fs.writeFileSync(configFilePath, JSON.stringify({ uniqueId }, null, 2));
                console.log(`Config file created with unique ID: ${uniqueId}`);
            } else {
                // Leggi l'ID unico dal file di configurazione esistente
                const configContent = fs.readFileSync(configFilePath, 'utf-8');
                const config = JSON.parse(configContent);
                console.log(`Existing Unique ID: ${config.uniqueId}`);
                uniqueId = config.uniqueId;
            }
        } catch (error) {
            console.error(`Failed to manage the config file: ${error.message}`);
        }

        panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.interaction === 1) {
                    try {
                        // Usa il primo editor aperto (puoi cambiare la logica se hai altri requisiti)
                        const editors = vscode.window.visibleTextEditors;
                        if (editors.length === 0) {
                            panel.webview.postMessage({ command: 'error', message: 'No visible editors' });
                            vscode.window.showErrorMessage('No visible editors found. Please open a file and try again.');
                            return;
                        }

                        const activeEditor = editors[0]; // Usa il primo editor aperto 
                        const uri = activeEditor.document.uri;
                        const content = await readFileContent(uri);
                        panel.webview.postMessage({ command: 'setContent', content: content, isDirty: activeEditor.document.isDirty });
                    } catch (error) {
                        //console.error('Error reading file content:', error);
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
		panel.webview.html = getQuestContent(context, panel, uniqueId);
        
	});
	context.subscriptions.push(disposable);
}

// Aggiungi il file a .vscode/settings.json per escluderlo dal File Explorer
function createOrUpdateSettingsFile(settingsFilePath) {
    let settings = {};

    // Se il file settings.json esiste, leggilo
    if (fs.existsSync(settingsFilePath)) {
        settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
    }

    // Se non esiste, assicurati che abbia un oggetto vuoto inizialmente
    if (!settings.files) {
        settings.files = {};
    }

    if (!settings.files.exclude) {
        settings.files.exclude = {};
    }

    // Aggiungi la configurazione per escludere .config.json e .vscode/settings.json dal File Explorer
    settings.files.exclude[`**/.config.json`] = true;
    settings.files.exclude[`**/.vscode/settings.json`] = true;

    // Scrivi o aggiorna il file settings.json
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
    console.log(`Updated .vscode/settings.json to exclude .config.json and itself`);

    setReadOnly(settingsFilePath);
}

function setReadOnly(filePath) {
    try {
        if (process.platform === 'win32') {
            // Windows: Usa il comando icacls per impostare solo lettura
            execSync(`icacls "${filePath}" /grant:r everyone:(R)`);
        } else {
            // macOS e Linux: Usa il comando chmod per impostare solo lettura
            fs.chmodSync(filePath, 0o444);
        }
        console.log(`File ${filePath} is set to read-only`);
    } catch (error) {
        console.error(`Failed to set read-only permission: ${error.message}`);
    }
}

function generateUniqueId() {
    // Genera un ID unico usando Date e Math.random
    return Date.now() - Math.floor(Math.random() * 1000000);
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


function getQuestContent(context, panel, id) {

    const bgUri1 = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `bg1.png`))).toString();
    const bgUri2 = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `bg2.png`))).toString();
    const bgUri3 = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `bg3.png`))).toString();
    const bgUri4 = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `bg4.png`))).toString();
    const bgUri5 = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `bg5.png`))).toString();

    var quests = [
        //0 INIZIO
        {
            sfondo: bgUri1,
            interaction:2,
        },
        {
            pg: "Linus",
            line: "Che posto è questo?!",
            interaction: 0,
        },
        {
            pg: "Ritchie",
            line: "Ciao! Mi chiamo Ritchie. Ti do il mio benvenuto nella ridente CodeLand!",
            interaction: 0,
        },
        {
            pg: "Linus",
            line: "Un drago parlante?! Cia-a-a-o Ritchie! Mi chiamo Linus. Come faccio a tornare a casa?",
            interaction: 0,
        },
        {
            pg: "Ritchie",
            line: "Quello che è successo a te è già successo ad un altro ragazzo. È stato infatti lui a darmi questo nome, il suo nome.\nPer tornare a casa lui suonò la campana del vecchio campanile nella Valle delle Variabili. Ma è molto pericoloso!",
            interaction: 0,
        },
        {
            pg: "Linus",
            line: "Sono pronto a correre il rischio! Devo tornare a casa prima delle 14!",
            interaction: 0,
        },
        {
            pg: "Ritchie",
            line: "Prima di partire dovrai equipaggiare un'arma, una difesa e una magia." +
            "\nA CodeLand ogni elemento è contenuto in una scatola detta variabile con un nome e un tipo. Il tipo serve a specificare che tipo di dato può contenere la varibile ossia il valore!" +
            "Indica, usando la legenda, per ogni categoria l’intero associato all’oggetto che intendi equipaggiare. Io dichiaro di fare uso della magia in questo modo: “int magia;”. Adesso prova tu! ",
            interaction: 1,
            regexQuest: '[\\s\\S]*int\\s+arma;\\s*int\\s+difesa;\\s*int\\s+magia;[\\s\\S]*$',
        },
        {
            pg: "Ritchie",
            line: "Adesso inizializzo la mia magia con Palla Di Fuoco in questo modo: magia = 1;. Adesso scegli il tuo equipaggiamento dalla legenda",
            interaction:1,
            regexQuest: '[\\s\\S]*int\\s+arma\\s*=\\s*[1-3]\\s*;\\s*int\\s+difesa\\s*=\\s*[1-3]\\s*;\\s*int\\s+magia\\s*=\\s*[1-3]\\s*;[\\s\\S]*$',
        },
        {
            pg: "Ritchie",
            line: "Adesso siamo pronti per l’avventura…forse. Senza denaro non si è mai davvero pronti! Ecco a te cento denari",
            interaction:0,
        },
        //GOBLIN 9
        {
            sfondo: bgUri2,
            interaction:2,
        },
        {
            pg: "Goblin",
            line: "Salve stranieri. Dove avete intenzione di andare?!",
            interaction:0,
        },
        {
            pg: "Linus",
            line: "Dobbiamo raggiungere la Valle delle Variabili, signor Goblin",
            interaction:0,
        },
        {
            pg: "Goblin",
            line: "Ahah bene! Immagino non sappiate che potete passare di qui ad una sola condizione: mi dovete un pedaggio che ammonta alla insulsa cifra di 70 denari",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Linus sapevo che quei 100 denari ti sarebbero ritornati utili ma non pensavo così presto! Ti conviene fare quello che dice.",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Verifica di avere almeno 70 denari in questo modo “if(denari >= 70) {” così da controllare se sei in possesso del denaro necessario e poi consegna il denaro sottraendolo a quello in tuo possesso in questo modo “portafogli = portafogli – 70;”. Non dimenticare di mettere una parentesi graffa chiusa per chiudere il blocco della condizione ( } )",
            interaction:1,
            regexQuest: '[\\s\\S]*if\\s*\\(\\s*portafogli\\s*>=\\s*70\\s*\\)\\s*\\{\\s*portafogli\\s*=\\s*portafogli\\s*-\\s*70\\s*;\\s*\\}[\\s\\S]*$',
        },
        {
            pg: "Goblin",
            line: "Grazie cari viaggiatori per la vostra gentilissima offerta. Vi auguro un viaggio tranquillo e privo di pericoli ihihih",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Si, come no, ciao ciao! Linus i goblin da queste parti non agiscono mai da soli.",
            interaction:0,
        },
        {
            pg: "Linus",
            line: "Non sei per nulla rassicurante Ritchie. Sai cos’altro non è rassicurante?! L’idea di dover fare tutta questa strada a piedi",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "A questo c’è rimedio! Sapevi di avere un fedele destriero in questo mondo? Tutti i cittadini ne hanno uno. L’unica decisione buona presa dal governatore di queste terre nonché quella che lo ha fatto diventare governatore.",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Ma torniamo a noi: Chiama il tuo destriero usando la funzione “chiamaDestriero();”. Le funzioni sono molto utili perché al suo interno contengono del codice che compie un’azione. All’utilizzatore di essa non interessa come sia fatta la funzione ma sapere solo quel è il suo compito e invocarla al momento giusto. Prova a chiamare il cavallo adesso",
            interaction:1,
            regexQuest: '[\\s\\S]*chiamaDestriero\\s*\\(\\s*\\);[\\s\\S]*$',
        },
        {
            pg: "Cavallo",
            line: "IIIIIIIIH (nitrisce)",
            interaction:0,
        },
        {
            pg: "Linus",
            line: "Uooo bello!",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Visto?! È stato facile come invocare una funzione! Sapevi che le funzioni possono richiedere dei dati in ingresso per poter funzionare? Basta inserirli tra le parentesi che seguono il nome della funzione. Inoltre, le funzioni possono restituire dei dati in uscita che potranno essere usati per valorizzare delle variabili!",
            interaction:0,
        },
        //CAPO GOBLIN 23
        {
            sfondo: bgUri3,
            interaction:2,
        },
        {
            pg: "Capo Goblin",
            line: "Salve nanerottoli! Sarò breve con voi: Pagate il “pedaggio” di 70 denari come avete fatto con il mio servo o vi spazzo via",
            interaction:0,
        },
        {
            pg: "Linus",
            line: "Ed ora che faccio Ritchie?! Non mi pare di avere denaro a sufficienza!",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Verifica di avere almeno 70 denari e se la condizione è vera sottrai il denaro al tuo portafogli. Altrimenti, se la condizione di possedere 70 denari non fosse verificata, pianifica un attacco come azione alternativa. Per fare questo, dopo il blocco di verifica di possesso del denaro, puoi pianificare un attacco usando la funzione colpisci() in questo modo:  else{ \n colpisci(); \n}",
            interaction:1,
            regexQuest: '[\\s\\S]*if\\s*\\(\\s*portafogli\\s*>=\\s*70\\s*\\)\\s*\{\\s*portafogli\\s*=\\s*portafogli\\s*-\\s*70\\s*;\\s*\\}[\\s\\S]*$',

        },
        {
            pg: "Linus",
            line: "Ecco il \"pedaggio\" che ti meriti!",
            interaction:0,
        },
        {
            pg: "Capo Goblin",
            line: "Sigh! Sob!",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Sei stato fortissimo Linus!",
            interaction: 0,
        },
        //PORTONE 29
        {
            sfondo: bgUri4,
            interaction: 2
        },
        {
            pg: "Linus",
            line: "Questo portone è enorme! Non credo sia possibile aprirlo senza chiave",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Invece un trucco c’è! Vedi quel piccolo punto dorato vicino alla serratura? Se colpisci dieci volte quel punto esatto con la tua magia, il portone si aprirà.",
        },
        {
            pg: "Ritchie",
            line: "Per farlo dovrai effettuare l’iterazione di un colpo finché non ne avrai scagliati dieci. Puoi farlo con il costrutto while(condizione){ colpisci(); }. Prova tu a scrivere la condizione utilizzando una variabile contatore_colpi che dovrai precedentemente dichiarare come variabile int inizializzata con il valore 0. Non dimenticare di incrementare contatore_colpi subito dopo aver colpito!",
            interaction:1,
            regexQuest: '[\\s\\S]*int\\s+contatore_colpi\\s*=\\s*0\\s*;\\s*while\\s*\\(\\s*contatore_colpi\\s*<\\s*10\\s*\\)\\s*\\{\\s*colpisci\\s*\\(\\s*\\)\\s*;\\s*contatore_colpi\\s*=\\s*contatore_colpi\\s*\\+\\s*1\\s*;\\s*\\}[\\s\\S]*$',
        },
        {
            pg: "Linus",
            line: "Evviva ce l’ho fatta. Inizio a credere molto di più nelle mie capacità Ritchie!",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Credere nei propri sogni risveglia la forza che abbiamo dentro! Non smettere mai di sognare!",
            interaction: 0,
        },
        //parte della valle degli UNO
        //35 Campanile
        {
            sfondo: bgUri5,
            interaction: 2
        },
        {
            pg: "Ritchie",
            line: "Mio caro Linus eccoci al campanile! Colui che ti ha preceduto fece fare alla campana sette rintocchi usando le due corde che cadono dal cielo. Non ricordo però in che modo andavano usate le corde!",
            interaction: 0,
        },
        {
            pg: "Linus",
            line: "Hai visto Ritchie? Le corde delle campane si illuminano come raggi di sole quando le campane stanno per rintoccare!",
            interaction:0,
        }, 
        {
            pg: "Ritchie",
            line: "Adesso ricordo come fare! Per farlo però dovrai usare tutto ciò che hai imparato in questo viaggio! Dovrai contare sette rintocchi ma ogni rintocco dovrà essere fatto tirando la corda che si illuminerà! Ciò ti richiede di mescolare l’interazione e if/else. Prova a scrivere un’iterazione che durerà fino a che i rintocchi non saranno sette. A CodeLand 1 significa condizione vera mentre 0 significa condizione falsa!",
            interaction: 0,
        },
        {
            pg: "Ritchie",
            line: "Per ogni iterazione dovrai verificare se la corda che si illumina è la sinistra mediante la funzione cordaTirataSinistra(); Questa funzione restituisce 1 se si altrimenti restituisce 0. Altrimenti ad illuminarsi sarà la corda destra. Quando avrai tirato la campana con la funzione tiraCordaSinistra(); o tiraCordaDestra(); non dimenticarti di incrementare il contatore_rintocchi che ti servirà nel while per contare i sette rintocchi!",
            interaction:1,
            regexQuest: '[\\s\\S]*while\\s*\\(\\s*contatore_rintocchi\\s*<\\s*7\\s*\\)\\s*\\{\\s*if\\s*\\(\\s*cordaTirataSinistra\\s*\\(\\s*\\)\\s*\\)\\s*\\{\\s*tiraCordaSinistra\\s*\\(\\s*\\)\\s*;\\s*contatore_rintocchi\\s*=\\s*contatore_rintocchi\\s*\\+\\s*1\\s*;\\s*\\}\\s*else\\s*\\{\\s*tiraCordaDestra\\s*\\(\\s*\\)\\s*;\\s*contatore_rintocchi\\s*=\\s*contatore_rintocchi\\s*\\+\\s*1\\s*;\\s*\\}\\s*\\}[\\s\\S]*$',
        },
        {
            pg: "Ritchie",
            line: "Sei bravissimo Ritchie!",
            interaction:0,
        },
        {
            pg: "Ritchie",
            line: "Per tornare a casa non ti resta che farti trasportare dal raggio di luce! La nostra avventura finisce qui! Prima che tu vada, sappi che quest’avventura mi ha fatto conoscere un amico speciale. Non mi dimenticherò mai di te!",
            interaction:0,
        },
        {
            pg: "Linus",
            line: "Oh Ritchie! Mi mancherà tantissimo galoppare con te per CodeLand. Adesso però il mio mondo mi aspetta. A presto!",
            interaction:0,
        },
        {
            pg: "Linus",
            line: "Ciao Linus. A presto!",
            interaction:0,
        },
    ];  

    // Crea URI per le immagini
    const questsWithImgSrc = quests.map(quest => {
        const imgUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `${quest.pg}.png`)));
        return { ...quest, imgSrc: imgUri.toString() };
    });

    const ostUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `ost.wav`))).toString();

    const audio = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `audio.png`))).toString();
    const no_audio = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `no-audio.png`))).toString();
    const legendaUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', `legenda.png`))).toString();
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gioca!</title>
        <script>
            const vscode = acquireVsCodeApi();
            let currentIndex = 0;
            let errorCounter = 0;
            const quests = ${JSON.stringify(questsWithImgSrc)};

            document.addEventListener('DOMContentLoaded', function() {
                const audio = document.createElement('audio');
                audio.setAttribute('autoplay', true);
                audio.setAttribute('loop', true);

                const sourceElement = document.createElement('source');
                sourceElement.setAttribute('src', '${ostUri}');
                sourceElement.setAttribute('type', 'audio/wav');

                audio.appendChild(sourceElement);
                document.body.appendChild(audio);

                const button = document.getElementById('play-button');
                button.style.backgroundImage = 'url("${no_audio}")'

                button.addEventListener('click', function() {
                    if(audio.paused){
                        audio.play();
                        button.style.backgroundImage = 'url("${audio}")'
                    }
                    else{
                        audio.pause();
                        button.style.backgroundImage = 'url("${no_audio}")'
                    }
                    
                })
            });



            function errorDetected(message, index){
                const baloon = document.getElementById('baloon');
                const pgImg = document.getElementById('pgImg');
                baloon.innerHTML = \`\${quests[index].line}<br>\${message}\`;
            }

            function updateContent(index) {
                const baloon = document.getElementById('baloon');
                const pgImg = document.getElementById('pgImg');
                baloon.innerHTML = \`\${quests[index].line}\`;
                baloon.style.fontSize = 18+'px'
                setTimeout(function () {
                        
                    baloon.style.opacity = 1;
                    pgImg.style.opacity = 1;

                    if(quests[index].interaction === 1){
                        baloon.style.backgroundColor = 'green';
                        baloon.style.color = 'white';
                    } else{
                        baloon.style.backgroundColor = '#EFCA08';
                        baloon.style.color = 'black';
                    }
                    if(quests[index].pg === 'Linus' || quests[index].pg === 'Cavallo'){
                        pgImg.style.float = 'left'; 
                        baloon.classList.add('slide-in-left');
                        
                        baloon.addEventListener('animationend', () => {
                            baloon.classList.remove('slide-in-left');
                        });

                        pgImg.src = quests[index].imgSrc;
                    }
                    else {
                        let legenda = 0;
                        if(index === 7){
                            const pgCont = document.getElementById('pgCont');
                            legenda = document.createElement('img')
                            legenda.id = 'legenda'
                            legenda.width = 150
                            legenda.height = 400
                            legenda.src = '${legendaUri}';
                            pgCont.appendChild(legenda)
                        }else if(index === 8){
                            document.getElementById('legenda').remove()
                        }
                        pgImg.style.float = 'right';
                        baloon.classList.add('slide-in-right');
                        baloon.addEventListener('animationend', () => {
                            baloon.classList.remove('slide-in-right');
                        });
                        pgImg.src = quests[index].imgSrc;
                    }
                    
                    switch (index) {
                        case 0:
                            baloon.classList.remove('slide-in-right');
                            baloon.classList.remove('slide-in-left');
                            document.body.style.backgroundImage = 'url(${bgUri1})';
                            pgImg.style.opacity = 0;
                            baloon.innerHTML = 'Benvenuto in <strong>"Linus e le avventure Informatiche!"</strong> <br>Aiuta Linus a superare le sfide che incontrerà lungo il suo cammino scrivendo codice in C!<br> <strong>Quando la nuvoletta di testo diventa verde inserisci il codice richiesto in sandbox.c a destra per andare avanti.</strong><br>Se tenti di andare avanti e il codice è sbagliato verrà conteggiato un errore.<br>Buon Viaggio!' 

                            break;
                        case 9:
                            baloon.classList.remove('slide-in-right');
                            baloon.classList.remove('slide-in-left');
                            document.body.style.backgroundImage = 'url(${bgUri2})';
                            baloon.style.opacity = 0;
                            pgImg.style.opacity = 0;
                            break;
                        case 23:
                            baloon.classList.remove('slide-in-right');
                            baloon.classList.remove('slide-in-left');
                            document.body.style.backgroundImage = 'url(${bgUri3})';
                            baloon.style.opacity = 0;
                            pgImg.style.opacity = 0;
                            break; 
                        case 30:
                            baloon.classList.remove('slide-in-right');
                            baloon.classList.remove('slide-in-left');
                            document.body.style.backgroundImage = 'url(${bgUri4})';
                            baloon.style.opacity = 0;
                            pgImg.style.opacity = 0;
                            break;
                        case 36:
                            baloon.classList.remove('slide-in-right');
                            baloon.classList.remove('slide-in-left');
                            document.body.style.backgroundImage = 'url(${bgUri5})';
                            baloon.style.opacity = 0;
                            pgImg.style.opacity = 0;
                            break;
                    }    
                }, 0);

            }

            document.addEventListener('DOMContentLoaded', function() {
                updateContent(currentIndex);
                
                document.getElementById('avanti').addEventListener('click', async () => {
                    if(document.getElementById('avanti').value === 'Fine'){
                        let playButton = document.getElementById('play-button') 
                        document.body.style.backgroundColor = '#6156fc62'
                        document.body.style.backgroundImage = ''
                        document.body.style.color = 'yellow'
                        document.getElementById('pgCont').remove()
                        document.getElementById('baloon').remove()
                        document.getElementById('dashboard').remove()
                        document.body.appendChild(playButton);

                        let score = document.createElement('p');
                        score.id = 'score';
                        let testoErrori = 'Hai commesso ' + errorCounter + ' error' + (errorCounter === 1 ? 'e' : 'i');
                        score.textContent = testoErrori
                        score.style.fontSize = 40+'px'
                        document.body.appendChild(score);

                        let idUtente = document.createElement('p');
                        score.id = 'idUtente';
                        let testoUtente = 'Il tuo id è ${id}'
                        idUtente.textContent = testoUtente
                        idUtente.style.fontSize = 40+'px'
                        document.body.appendChild(idUtente);

                        let classificaTitle = document.createElement('p');
                        classificaTitle.id = 'classificaTitle';
                        classificaTitle.textContent = 'La classifica globale'
                        classificaTitle.style.fontSize = 30+'px'
                        document.body.appendChild(classificaTitle);
                        
                        let table = document.createElement('table')

                        const data = {
                            id: ${id},
                            punteggio: errorCounter
                        } 

                        await salvaMostraClassifica(data);
                    }    
                    else
                        vscode.postMessage({interaction: quests[currentIndex].interaction });
                });
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (currentIndex < quests.length - 1) {
                        const regex = new RegExp(quests[currentIndex].regexQuest); 
                        
                        if(regex){
                            if(message.isDirty){
                                errorDetected('Salva prima il file! Ti basta premere Ctrl + S', currentIndex)
                            }
                            else{
                                content = message.content 
                                if (regex.test(content)){
                                    currentIndex++;
                                    updateContent(currentIndex);
                                }
                                else{
                                    errorCounter++;
                                    errorDetected("C'è un errore Linus. Riprova!", currentIndex);  
                                }
                            }
                        }
                        else{
                            currentIndex++;
                            updateContent(currentIndex);
                        } 
                    }
                    else{
                        document.getElementById('avanti').value = 'Fine';    
                    }
                });

                /*document.getElementById('indietro').addEventListener('click', function() {
                    if (currentIndex > 0) {
                        currentIndex--;
                        updateContent(currentIndex);
                    }
                });*/
            });

            async function mostraClassifica(){
                await fetch('http://localhost:3000/api/punteggio')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log(data);  // Elenco i dati ottenuti
                        createTable(data);
                    })
                    .catch(error => {
                        console.error('errore di fetch:', error);
                });
            }

            async function salvaPunteggio(data){
            let responseData = 0;
            try {
                // Esegue la richiesta POST
                const response = await fetch('http://localhost:3000/api/punteggio/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                // Controlla se la richiesta ha avuto successo
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                // Recupera la risposta come JSON
                responseData = await response.json();

                console.log(responseData.id);
            } catch (error) {
                console.log(error.message)
            }
                return responseData;
            }

            async function salvaMostraClassifica(data){
                await salvaPunteggio(data);

                await mostraClassifica();
            
            }

            function createTable(data) {

                // Crea la tabella
                const table = document.createElement('table');

                // Crea l'intestazione della tabella
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                
                const headerUser = document.createElement('td');
                const headerPunteggio = document.createElement('td');
                
                headerUser.textContent = 'User'
                headerPunteggio.textContent = 'Errori'
          
                headerUser.style.fontSize = 30+'px'
                headerPunteggio.style.fontSize = 30+'px'

                headerRow.appendChild(headerUser)
                headerRow.appendChild(headerPunteggio)                

                thead.appendChild(headerRow);
                table.appendChild(thead);

                // Crea il corpo della tabella
                
                let tbody = document.createElement('tbody')
                data.forEach(element => {
                    const row = document.createElement('tr');
                    const tdId = document.createElement('td');
                    tdId.textContent = element.id;
                    const tdPunteggio = document.createElement('td');
                    tdPunteggio.textContent = element.punteggio;

                    tdId.style.fontSize = 28+'px'
                    tdPunteggio.style.fontSize = 28+'px'

                    row.appendChild(tdId);
                    row.appendChild(tdPunteggio);
                    if(element.id == ${id}){
                        row.style.backgroundColor = 'red'
                        row.style.color = 'black'
                    }

                    tbody.appendChild(row);
                    table.appendChild(tbody);
                });

                // Aggiungi la tabella al contenitore
                document.body.appendChild(table);
            }
        </script>

        <style>

            body{
                display: flex;
                flex-direction: column;
                justify-content: center;
                background-size: contain;
                background-repeat: no-repeat;
            }

            #pgImg{
                height: 600px;
                width: 600px;
            }
            
            @keyframes slide-in-left {
                0% {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                100% {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slide-in-right {
            0% {
                transform: translateX(200%);
                opacity: 0;
                }
            100% {
                transform: translateX(0);
                opacity: 1;
                }
            }
            #baloon{
                color: #000000;
                background-color: #EFCA08;
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 50px;
                height: 130px; 
            }

            .slide-in-left {
                animation: slide-in-left 1s ease-out;
            }

            .slide-in-right {
                animation: slide-in-right 1s ease-out;
            }

            #dashboard{
                display: flex;
                flex-direction: row;
                justify-content: space-evenly;
                align-items: center;
                padding: 10px;
                border-radius: 15px;
                border: 1px;
                background-color: #6258FF;
            }
            #dashboard input{
                height: 60px;
                width: 100px;
                border: none;
                box-shadow:none;
                background-color: #EFCA08;
                border-radius: 15px;
                font-weight: bold;
                font-size: 15px;
            }

            #play-button {
                width: 32px;
                height: 32px;
                background-color: transparent;
                background-size: cover;   
                background-repeat: no-repeat; 
                background-position: center;
                box-shadow: none;
                border: none;
            }

            #pgCont{
                overflow-x: auto;
                white-space: nowrap;
            }

        </style>

    </head>
    <body>
        <div id="baloon"></div>
        <div id="pgCont">    
            <img id="pgImg" alt="Personaggio"/>
        </div>
        <div id = "dashboard">
            <button id="play-button"></button>
            <input type="button" id="avanti" value="Avanti"/>
        </div>
        
    </body>
    </html>`;
}


// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}