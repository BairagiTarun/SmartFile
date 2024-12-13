let fileSystemTree =[
    {
      isDirectory: true,
      name: 'Test folder',
      child: [
        {
          isDirectory: false,
          name: 'text.txt',
        }
      ]
    },
    {
      isDirectory: false,
      name: 'index.html',
    },
    {
      isDirectory: false,
      name: 'index.php',
    },
    {
      isDirectory: false,
      name: 'textfile.txt',
    },
    {
      isDirectory: false,
      name: 'textfile.exe',
    },
    // 50 additional files and folders
    {
      isDirectory: true,
      name: 'Folder A',
      child: [
        {
          isDirectory: false,
          name: 'fileA1.txt',
        },
        {
          isDirectory: false,
          name: 'fileA2.js',
        },
        {
          isDirectory: true,
          name: 'Subfolder A',
          child: [
            {
              isDirectory: false,
              name: 'fileA3.css',
            },
            // Add more files or folders here as needed
          ]
        },
        // Add more files or folders here as needed
      ]
    },
    {
      isDirectory: false,
      name: 'fileB1.html',
    },
    {
      isDirectory: true,
      name: 'Folder B',
      child: [
        {
          isDirectory: false,
          name: 'fileB2.php',
        },
        // Add more files or folders here as needed
      ]
    },
    // Add more files or folder''s here as needed
  ];

class HistoryStack{
    #items;
    constructor(){
        this.#items = []
    }
    push(item){
        this.#items.push(item)
    }
    pop(){
        return this.#items.pop()
    }
    peek(){
        return this.#items[this.#items.length - 1]
    }
    isEmpty(){
        return this.#items.length === 0
    }
    size(){
        return this.#items.length
    }
    print(){
        console.log(this.#items.join(', '))
    }
}   
let prePaths = new HistoryStack()
let forPaths = new HistoryStack()
let fileSystem = fileSystemTree;
let selected_item = {
    item:{},
    index:0
};
loadFileSystemFromLocalStorage();
initFileManager('root/');
function initFileManager(path,config={keepHistory:true,callback:resetContextMenu}){
    document.querySelector('.folder-path-input').value = path;
    if(config.keepHistory)prePaths.push(path)
    let fileSys = JSON.parse(JSON.stringify(fileSystem));
    let pathArr = path.split('/')
    if((pathArr[0]!='root')) return newToast('error','404 | Path doesn\'t exist!',(close)=>setTimeout(()=>close(),5000))
    let flag = 0;
    for (let i = 1; i < pathArr.length; i++) {
        if(pathArr[i]){
            for (const folder in fileSys) {
                if(fileSys[folder].name == pathArr[i]){
                    fileSys = fileSys[folder].child;
                    flag++; 
                    break;
                }
            }
        }
    }
    if((pathArr.length-(pathArr[pathArr.length-1]?1:2)!=flag)) return newToast('error','404 | Path doesn\'t exist!',(close)=>setTimeout(()=>close(),5000))
    document.querySelector('.folderEmpty').style.display=(fileSys.length?'none':'block')
    setupFilemanager(fileSys)
    if(config.callback)config.callback();
}
function newItem(config = { isDirectory: true, name: 'unknown' }) {
    let path = document.querySelector('.folder-path-input').value;
    if (!(path && config.name)) {
        return newToast('error', 'Please fill out the name field!', (close) => setTimeout(close, 5000));
    }
    let fileSys = getFileSystemAtPath(path);
    if (config.isDirectory) {
        fileSys.push({
            isDirectory: true,
            name: config.name,
            child: []
        });
    } else {
        fileSys.push({
            isDirectory: false,
            name: config.name,
            content: config.content || ''
        });
    }
    saveFileSystemToLocalStorage(); // Save after adding a new item
    initFileManager(path, { keepHistory: false });
    newToast('success', `Saved new ${(config.isDirectory ? 'folder' : 'file')} "${config.name}"!`, (close) => setTimeout(close, 5000));
}

function renameItem(newName){
    if(selected_item.item?.name){
        let path= document.querySelector('.folder-path-input').value;
        let pathArr = path.split('/')
        let fileSys = fileSystem;
        for (let i = 1; i < pathArr.length; i++) {
            if(pathArr[i]){
                for (const folder in fileSys) {
                    if(fileSys[folder].name == pathArr[i]){
                        fileSys = fileSys[folder].child;
                        break;
                    }
                }
            }
        }
        fileSys[selected_item.index].name=newName;
        newToast('success','Changed file name into '+selected_item.item.name+'!',(remove)=>{
            setTimeout(() => {
                remove()
            }, 6000);
        })
        initFileManager(path,{keepHistory:false})
    }
}
function deleteItem() {
    if (selected_item.item?.name) {
        let path = document.querySelector('.folder-path-input').value;
        let fileSys = getFileSystemAtPath(path);
        fileSys.splice(selected_item.index, 1);
        saveFileSystemToLocalStorage(); // Save after deletion
        initFileManager(path, { keepHistory: false });
        newToast('success', `Deleted ${selected_item.item.isDirectory ? 'folder' : 'file'} "${selected_item.item.name}"!`, (remove) => {
            setTimeout(() => remove(), 6000);
        });
    }
}

function setupFilemanager(fileSystem){
    filesContainer = document.querySelector('.filemanager-container-row');
    filesContainer.innerHTML = ''
    resetHistoryBtn()
    for (const fileItem in fileSystem) {
        let div = document.createElement("div")
        div.setAttribute('title',fileSystem[fileItem].name)
        if(fileSystem[fileItem].isDirectory){
            div.classList.add('folder')
            div.addEventListener('dblclick',(e)=>{
                let toPath=document.querySelector('.folder-path-input').value+fileSystem[fileItem].name
                initFileManager(toPath+'/');
            })
            div.innerHTML += `
            <div class="folder-icon-container">
            <div class="folder-icon"></div>
            </div>
            <p class="folder-name">${fileSystem[fileItem].name}</p>
            `
        }else{
            // div.addEventListener('dblclick',(e)=>{})
            div.classList.add('file')
            let fileIcon = getFileIconMeta(fileSystem[fileItem])
            div.innerHTML += `
                    <div class="doc-icon-container">
                        <div class="doc-icon" style="--icon-color: ${fileIcon.color};"><p>${fileIcon.ext}</p></div>
                    </div>
                    <p class="file-name">${fileSystem[fileItem].name}</p>
            `;
            div.addEventListener('click', () => openFile(fileSystem[fileItem]));
        }
        filesContainer.appendChild(div)
        div.addEventListener('click',(e)=>{
            // selected_item=document.querySelector('.folder-path-input').value+fileSystem[fileItem].name
            selected_item.index=fileItem;
            selected_item.item=fileSystem[fileItem];
            document.querySelector('.item-selected')?.classList.remove('item-selected')
            div.classList.add('item-selected')
        })
    }
}
function getFileIconMeta(file) {
    let ext = file.name.split('.').pop().toLowerCase();
    let color, icon;

    switch (ext) {
        case 'txt':
            color = '116, 116, 116';
            icon = 'TXT';
            break;
        case 'pdf':
            color = '247, 72, 72';
            icon = 'PDF';
            break;
        case 'doc':
        case 'docx':
            color = '0, 102, 204';
            icon = 'DOC';
            break;
        case 'ppt':
        case 'pptx':
            color = '255, 102, 0';
            icon = 'PPT';
            break;
        case 'xls':
        case 'xlsx':
            color = '0, 153, 0';
            icon = 'XLS';
            break;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg':
            color = '36, 230, 149';
            icon = 'IMG';
            break;
        case 'zip':
        case 'rar':
            color = '190, 173, 16';
            icon = 'ZIP';
            break;
        case 'html':
        case 'htm':
            color = '255, 153, 51';
            icon = 'HTML';
            break;
        case 'js':
            color = '255, 204, 0';
            icon = 'JS';
            break;
        case 'css':
            color = '0, 153, 204';
            icon = 'CSS';
            break;
        case 'mp4':
        case 'mkv':
        case 'avi':
            color = '153, 0, 153';
            icon = 'VID';
            break;
        case 'mp3':
        case 'wav':
            color = '204, 51, 153';
            icon = 'AUD';
            break;
        default:
            color = '116, 116, 116';
            icon = 'FILE';
            break;
    }

    return { ext: icon, color };
}

function backward(){
    if(!prePaths.isEmpty()){
        let currPath = prePaths.pop()
        forPaths.push(currPath)
        initFileManager(prePaths.peek(),{keepHistory:false})
    }
}
function forward(){
    if(!forPaths.isEmpty()){
        let currPath = forPaths.pop()
        prePaths.push(currPath)
        initFileManager(currPath,{keepHistory:false})
    }
}
function resetHistoryBtn(){
    if((prePaths.size()-1)==0){
        document.getElementById('backwardBtn').setAttribute('disabled',true)
    }else{
        document.getElementById('backwardBtn').removeAttribute('disabled')
    }
    if(forPaths.isEmpty()){
        document.getElementById('forwardBtn').setAttribute('disabled',true)
    }else{
        document.getElementById('forwardBtn').removeAttribute('disabled')
    }
}
function uploadFiles(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    let path = document.querySelector('.folder-path-input').value;
    let fileSys = getFileSystemAtPath(path);

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            // Add file to the file system
            fileSys.push({
                isDirectory: false,
                name: file.name,
                content: e.target.result // Store file content
            });

            newToast('success', `Uploaded file "${file.name}"!`, (close) => setTimeout(close, 5000));
            initFileManager(path, { keepHistory: false });
        };
        reader.readAsDataURL(file); // Read the file as a data URL (for images, etc.)
    });
}

// Helper function to get the file system at a given path
function getFileSystemAtPath(path) {
    let fileSys = fileSystem;
    let pathArr = path.split('/');
    for (let i = 1; i < pathArr.length; i++) {
        if (pathArr[i]) {
            for (const folder of fileSys) {
                if (folder.isDirectory && folder.name === pathArr[i]) {
                    fileSys = folder.child;
                    break;
                }
            }
        }
    }
    return fileSys;
}

function openModel(modelFor){ //'newFile' 
    document.querySelector('.popup').style.display='flex'
    document.querySelector('.popup >.popup-bg').addEventListener('click',()=>document.querySelector('.popup').style.display='none')
    if(modelFor=='newFile'){
        document.querySelector('.popup h1').innerHTML = 'New file'
        let input = document.createElement('input')
        input.setAttribute('type','text')
        input.setAttribute('placeholder','Filename')
        let saveButton = document.createElement('button')
        saveButton.style = 'background-color: rgb(1, 158, 111);';
        saveButton.innerHTML = 'Save';
        document.querySelector('.popup form').innerHTML = ''
        document.querySelector('.popup form').appendChild(input); 
        document.querySelector('.popup form').appendChild(saveButton); 
        saveButton.addEventListener('click',()=>{
            newItem(config={isDirectory:false,name:input.value});
            document.querySelector('.popup').style.display='none'
        })
    }
    if(modelFor=='newFolder'){
        document.querySelector('.popup h1').innerHTML = 'New Folder'
        let input = document.createElement('input')
        input.setAttribute('type','text')
        input.setAttribute('placeholder','Foldername')
        let saveButton = document.createElement('button')
        saveButton.style = 'background-color: rgb(1, 158, 111);';
        saveButton.innerHTML = 'Save';
        document.querySelector('.popup form').innerHTML = ''
        document.querySelector('.popup form').appendChild(input); 
        document.querySelector('.popup form').appendChild(saveButton); 
        saveButton.addEventListener('click',()=>{
            newItem(config={isDirectory:true,name:input.value});
            document.querySelector('.popup').style.display='none'
        })
    }
    if(modelFor=='rename'){
        if(selected_item.item?.name){

            document.querySelector('.popup h1').innerHTML = 'Rename'
            let input = document.createElement('input')
            input.setAttribute('type','text')
            input.setAttribute('placeholder',(selected_item.item.isDirectory?'Folder':'File')+' name ('+selected_item.item.name+')')
            input.value = selected_item.item.name;
            let saveButton = document.createElement('button')
            saveButton.style = 'background-color: rgb(1, 158, 111);';
            saveButton.innerHTML = 'Save';
            document.querySelector('.popup form').innerHTML = ''
            document.querySelector('.popup form').appendChild(input); 
            document.querySelector('.popup form').appendChild(saveButton); 
            saveButton.addEventListener('click',()=>{
                renameItem(input.value);
                document.querySelector('.popup').style.display='none'
            })
        }else{
            document.querySelector('.popup').style.display='none'
            newToast('error','Please select a File or Folder which you want to rename!',(remove)=>{
                setTimeout(() => {
                    remove()
                }, 6000);
            })
        }
    }
    if(modelFor=='delete'){
        if(selected_item.item?.name){

            document.querySelector('.popup h1').innerHTML = 'Sure to delete?'
            let saveButton = document.createElement('button')
            let cancelButton = document.createElement('button')
            saveButton.style = 'background-color: rgb(1, 158, 111);';
            saveButton.innerHTML = 'Yes';
            cancelButton.innerHTML = 'Cancel';
            document.querySelector('.popup form').innerHTML = ''
            // document.querySelector('.popup form').appendChild(input); 
            document.querySelector('.popup form').appendChild(saveButton); 
            document.querySelector('.popup form').appendChild(cancelButton); 
            saveButton.focus()
            saveButton.addEventListener('click',()=>{
                deleteItem();
                document.querySelector('.popup').style.display='none'
            })
            cancelButton.addEventListener('click',()=>{
                document.querySelector('.popup').style.display='none'
            })
        }else{
            document.querySelector('.popup').style.display='none'
            newToast('error','Please select a File or Folder which you want to delete!',(remove)=>{
                setTimeout(() => {
                    remove()
                }, 6000);
            })
        }
    }
}
function openFile(file) {
    if (!file.content) {
        newToast('error', 'No content available for this file!', (close) => setTimeout(close, 3000));
        return;
    }

    // Create a new window for displaying the file
    const fileWindow = window.open();
    const fileType = file.name.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileType)) {
        // If the file is an image, display it directly
        fileWindow.document.write(`<img src="${file.content}" style="max-width: 100%; max-height: 100vh;">`);
    } else if (fileType === 'pdf') {
        // If the file is a PDF, embed it in the new window
        fileWindow.document.write(`<embed src="${file.content}" width="100%" height="100%" type="application/pdf">`);
    } else {
        // For other file types, display the content as plain text
        fileWindow.document.write(`<pre style="white-space: pre-wrap; word-wrap: break-word;">${file.content}</pre>`);
    }

    fileWindow.document.title = file.name;
}
function newToast(sts,message,cb){
    sts = (sts=='success'?'toast-sccess':(sts=='error'?'toast-dnger':'toast-inf'));
    let tContainer = document.querySelector('.toast-messages')
    let c = document.createElement('div')
    let bc = document.createElement('div')
    let p = document.createElement('p')
    let b = document.createElement('button')
    c.classList.add('toast-container',sts)
    // c.setAttribute('id','sjdfnksjdfn');
    p.innerText = message;
    b.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    b.addEventListener('click',removeToast);
    c.appendChild(p)
    bc.appendChild(b)
    c.appendChild(bc)
    tContainer.prepend(c)
    setTimeout(() => {
        c.style.opacity = '1'
    }, 300);
    function removeToast(){
        c.style = `
            opacity:0;
        `
        setTimeout(() => {
            c.remove()
        }, 500);
    }
    if(cb)cb(removeToast);
}

newToast('info','Welcome: in testing mode...',(remove)=>{
    setTimeout(() => {
        remove()
    }, 10000);
})
window.addEventListener('focus',()=>{
    
    newToast('info','Welcome back!',(remove)=>{
        setTimeout(() => {
            remove()
        }, 3000);
    })
})
window.addEventListener('blur',(e)=>{
    newToast('info','Seems you gone!',(remove)=>{
        e.target.addEventListener('focus',()=>{
            setTimeout(() => {
                remove()
            }, 1200);
        })
    })
})
function searchFiles() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filesContainer = document.querySelector('.filemanager-container-row');
    const fileElements = filesContainer.querySelectorAll('.folder, .file');

    fileElements.forEach((element) => {
        const fileName = element.querySelector('p.folder-name, p.file-name').textContent.toLowerCase();
        if (fileName.includes(query)) {
            element.style.display = 'flex'; // Show matching files/folders
        } else {
            element.style.display = 'none'; // Hide non-matching files/folders
        }
    });
}
let clipboard = null; // To hold the copied or cut item
let clipboardAction = ''; // Either 'cut' or 'copy'

// Function to copy an item
function copyItem() {
    if (selected_item.item?.name) {
        clipboard = { ...selected_item.item, path: document.querySelector('.folder-path-input').value };
        clipboardAction = 'copy';
        newToast('success', `Copied ${clipboard.isDirectory ? 'folder' : 'file'} "${clipboard.name}"`, (close) => setTimeout(close, 3000));
        document.getElementById('pasteBtn').removeAttribute('disabled');
    } else {
        newToast('error', 'Please select a file or folder to copy!', (close) => setTimeout(close, 3000));
    }
}

// Function to cut an item
function cutItem() {
    if (selected_item.item?.name) {
        clipboard = { ...selected_item.item, path: document.querySelector('.folder-path-input').value };
        clipboardAction = 'cut';
        newToast('success', `Cut ${clipboard.isDirectory ? 'folder' : 'file'} "${clipboard.name}"`, (close) => setTimeout(close, 3000));
        document.getElementById('pasteBtn').removeAttribute('disabled');
    } else {
        newToast('error', 'Please select a file or folder to cut!', (close) => setTimeout(close, 3000));
    }
}

// Function to paste an item
function pasteItem() {
    if (clipboard && clipboard.name) {
        let currentPath = document.querySelector('.folder-path-input').value;
        let targetFolder = getFileSystemAtPath(currentPath);

        // Check if the file/folder already exists in the current directory
        if (targetFolder.some(item => item.name === clipboard.name)) {
            newToast('error', `A file or folder named "${clipboard.name}" already exists!`, (close) => setTimeout(close, 3000));
            return;
        }

        // Add the copied item to the current folder
        const newItem = { ...clipboard };
        delete newItem.path; // Remove the original path reference

        if (clipboardAction === 'cut') {
            // Remove the item from its original location
            let originalFolder = getFileSystemAtPath(clipboard.path);
            originalFolder.splice(selected_item.index, 1);
            clipboard = null;
        }

        targetFolder.push(newItem);
        newToast('success', `${clipboardAction === 'copy' ? 'Pasted' : 'Moved'} "${newItem.name}"!`, (close) => setTimeout(close, 3000));

        clipboard = null;
        clipboardAction = '';
        document.getElementById('pasteBtn').setAttribute('disabled', true);
        initFileManager(currentPath, { keepHistory: false });
    }
}

function saveFileSystemToLocalStorage() {
    localStorage.setItem('fileSystemTree', JSON.stringify(fileSystem));
}
function loadFileSystemFromLocalStorage() {
    const savedFileSystem = localStorage.getItem('fileSystemTree');
    if (savedFileSystem) {
        fileSystem = JSON.parse(savedFileSystem);
    }
}
async function fetchFoldersAndFiles() {
    try {
        const folderResponse = await fetch('/api/folders/');
        const fileResponse = await fetch('/api/files/');
        const folders = await folderResponse.json();
        const files = await fileResponse.json();
        renderFoldersAndFiles(folders, files);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderFoldersAndFiles(folders, files) {
    const filesContainer = document.querySelector('.filemanager-container-row');
    filesContainer.innerHTML = '';

    // Render folders
    folders.forEach(folder => {
        const folderDiv = document.createElement('div');
        folderDiv.classList.add('folder');
        folderDiv.innerHTML = `<p class="folder-name">${folder.name}</p>`;
        filesContainer.appendChild(folderDiv);
    });

    // Render files
    files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.classList.add('file');
        fileDiv.innerHTML = `<p class="file-name">${file.name}</p>`;
        filesContainer.appendChild(fileDiv);
    });
}

// Call the function on page load
document.addEventListener('DOMContentLoaded', fetchFoldersAndFiles);

const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");

let userMessage = null;
const inputInitHeight = chatInput.scrollHeight;

const createChatLi = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi;
}

const generateResponse = (chatElement) => {
    const messageElement = chatElement.querySelector("p");

    messageElement.textContent = "The answer is yes";

    chatbox.scrollTo(0, chatbox.scrollHeight);
}

const handleChat = () => {
    userMessage = chatInput.value.trim();
    if(!userMessage) return;

    // Clear the input textarea and set its height to default
    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    // Append the user's message to the chatbox
    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);

    setTimeout(() => {
        // Display "Thinking..." message while waiting for the response
        const incomingChatLi = createChatLi("Thinking...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        generateResponse(incomingChatLi);
    }, 600);
}

chatInput.addEventListener("input", () => {
    // Adjust the height of the input textarea based on its content
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // If Enter key is pressed without Shift key and the window
    // width is greater than 800px, handle the chat
    if(e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleChat();
    }
});

sendChatBtn.addEventListener("click", handleChat);
closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));