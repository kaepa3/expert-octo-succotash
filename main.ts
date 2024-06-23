import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.34-alpha/deno-dom-wasm.ts";
import ky from "https://cdn.skypack.dev/ky@0.28.5?dts";
import puppeteer, {
  Browser,
  ElementHandle,
  Page,
} from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { Logger } from "./logger.ts";
import "https://deno.land/x/dotenv/load.ts";

const yahoo_mail: string = Deno.env.get("YAHOO_MAIL")!;
const yahoo_pass: string = Deno.env.get("YAHOO_PASS")!;

if (yahoo_mail == undefined || yahoo_pass == undefined) {
  Logger.error("init error");
  Deno.exit();
}
// 待機
function wait(second: number) {
  return new Promise((resolve) => setTimeout(resolve, 1000 * second));
}

class TableMaker {
  async createPageList(browser: Browser) {
    const list: string[] = [];
    for (const p of await browser.pages()) {
      list.push(await p.title());
    }
    return list;
  }
  async waitAllPage(browse: Browser) {
  }
  async GetTables() {
    // main処理
    const launch_opt = {
      channel: "chrome",
      args: ["--lang=ja,en-US,en"], // デフォルトでは言語設定が英語なので日本語に変更
      headless: false,
    };
    const browser = await puppeteer.launch(launch_opt);
    const page = (await browser.pages())[0];
    await page.emulate(puppeteer.devices["iPhone SE"]);
    await page.goto("https://lot.tsite.jp/#/top");
    const items = await page.$$(".item-kuji");
    Logger.info(items.length);
    if (items != null) {
      for (const item of items) {
        const list: string[] = await this.createPageList(browser);
        Logger.info(list);

        await item.click();
        await wait(2);

        let newPage: Page = page;
        for (const p of await browser.pages()) {
          const title = await p.title();
          Logger.info("check:" + title);
          if (list.indexOf(title) == -1) {
            newPage = p;
          }
        }
        if (newPage != null) {
          if (!/SKEY=(.*?)(&|$)/.test(newPage.url())) {
            Logger.info("login");
            Logger.info(await newPage.title());
            const loginImg = await newPage.$$("img.ng-tns-c31-1");
            Logger.info(loginImg.length);
            for (const i of loginImg) {
              const val = await i.evaluate((x) => x.getAttribute("alt"));
              Logger.info(val);
              if ("ログインしてくじをひく" === val) {
                await i.click();
                break;
              }
            }
          }
          Logger.info("playgame");
          await wait(10);
          await newPage.close();
        }
        wait(2);
      }
    }
    browser.close();
    return "";
  }
}

// main処理
const maker = new TableMaker();
const tables = await maker.GetTables();

Logger.info(tables);
/*
const launch_opt = {
  channel: "chrome",
  args: ["--lang=ja,en-US,en"], // デフォルトでは言語設定が英語なので日本語に変更
  headless: true,
};
const browser = await puppeteer.launch(launch_opt);
const page = await browser.newPage();
await page.emulate(puppeteer.devices["iPhone SE"]);
for (const table of tables) {
  for (const link of table.getElementsByTagName("a")) {
    try {
      //await playLot(page, link.getAttribute("href") || "");
      Logger.info(link);
      wait(1);
    } catch (e) {
      Logger.info("exception:" + page.url());
      Logger.info(e);
    }
  }
}
browser.close();
*/
Logger.info("fin");
