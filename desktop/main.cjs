const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const DEFAULT_PORT = Number(process.env.SYNC_AI_PORT || process.env.CODEX_IMAGE_ROUTER_PORT || 8756);
const MAX_PORT_ATTEMPTS = 20;

let serverHandle;
let mainWindow;

async function importHttpServer() {
  const serverPath = path.join(__dirname, "..", "dist", "http", "server.js");
  return import(pathToFileURL(serverPath).href);
}

async function startLocalServer() {
  const { createConfigHttpServer } = await importHttpServer();
  const errors = [];
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset += 1) {
    const port = DEFAULT_PORT + offset;
    const server = createConfigHttpServer();
    try {
      const address = await server.listen(port);
      return {
        server,
        port: address.port,
        url: `http://127.0.0.1:${address.port}/`
      };
    } catch (error) {
      errors.push(`${port}: ${error instanceof Error ? error.message : String(error)}`);
      await server.close().catch(() => undefined);
    }
  }
  throw new Error(`无法启动 sync-ai 本地服务：${errors.join("; ")}`);
}

async function createMainWindow() {
  serverHandle = await startLocalServer();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 1080,
    minHeight: 760,
    title: "sync-ai",
    backgroundColor: "#070A0F",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await mainWindow.loadURL(serverHandle.url);
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
}

function installMenu() {
  const template = [
    {
      label: "sync-ai",
      submenu: [
        {
          label: "打开控制台",
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        },
        {
          label: "在浏览器中打开",
          click: async () => {
            if (serverHandle?.url) {
              await shell.openExternal(serverHandle.url);
            }
          }
        },
        { type: "separator" },
        { role: "quit", label: "退出" }
      ]
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "GitHub 仓库",
          click: async () => {
            await shell.openExternal("https://github.com/1447751897/sync-ai");
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  installMenu();
  try {
    await createMainWindow();
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      title: "sync-ai 启动失败",
      message: error instanceof Error ? error.message : String(error)
    });
    app.quit();
  }

  app.on("activate", async () => {
    if (!mainWindow) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  if (serverHandle?.server) {
    await serverHandle.server.close().catch(() => undefined);
    serverHandle = undefined;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
