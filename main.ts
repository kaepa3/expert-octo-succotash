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

  async loginIfNeed(newPage: Page): Promise<boolean> {
    const loginImg = await newPage.$$("img.ng-tns-c31-1");
    for (const i of loginImg) {
      const val = await i.evaluate((x) => x.getAttribute("alt"));
      if ("ログインしてくじをひく" === val) {
        Logger.info("login");
        await i.click();
        let flg = false;
        await newPage.waitForSelector("button.button-red", {
          visible: true,
          timeout: 5000,
        }).then(async () => {
          const btn = await newPage.$("button.button-red");
          if (btn != null) {
            btn.click();
            await wait(1);
            await newPage.waitForSelector("#login_handle", {
              visible: true,
              timeout: 5000,
            }).then(async () => {
              const input = await newPage.$("#login_handle");
              if (input != null) {
                await wait(1);
                input.type(yahoo_mail);
                await wait(1);
                const div = await newPage.$(
                  "div.ar-button_button_J2jv2.ar-button_medium_1i9SB.ar-button_normal_1m_gx.ar-button_fullwidth_19rcY",
                );
                if (div != null) {
                  const btn = await div.$$("button");
                  if (btn != null) {
                    await btn[0].click();
                    //
                    await newPage.waitForSelector("button.altMethodButton",{
                      visible: true,
                      timeout: 5000
                    }).then(async()=>{
                      const btn = await newPage.$("button.altMethodButton");
                      if(btn !=null){
                        const obj = await btn.getProperty('innerText');
                        const text = await obj.jsonValue()
                        if(text==="他の方法でログイン"){
                          await btn.click()
                          Logger.info("yatta")
const otherMethodSelector= "div.ar-button_button_J2jv2.ar-button_small_1-WyF.ar-button_normal_1m_gx.ar-button_fullwidth_19rcY"
await newPage.waitForSelector(otherMethodSelector,{
  
  visible: true,
  timeout: 5000
}).then(async ()=>{
  const div = await newPage.$(otherMethodSelector)
  const btn=await div.$("button")
  const obj = await btn.getProperty('innerText');
  const text = await obj.jsonValue()
  if(text==="パスワード"){
    Logger.info("kokoda")
    await btn.click()
  }
});


                        }
                        else{
                          Logger.info("inner:" + text)
                        }
                      }
                    }).catch((a)=>{
                      Logger.info(a+":warning")
                    });
                    //
                    await newPage.waitForSelector("#password", {
                      visible: true,
                      timeout: 15000,
                    }).then(async () => {
                      await wait(1)
                      await newPage.type("#password", yahoo_pass);
                      await wait(1)
                      const div = await newPage.$(
                        "div.login.ar-button_button_J2jv2.ar-button_medium_1i9SB.ar-button_normal_1m_gx.ar-button_fullwidth_19rcY",
                      );
                      if (div != null) {
                        const btn = await div.$$("button");
                        if (btn != null) {
                          await Promise.all([
                            newPage.waitForNavigation(),
                            await btn[0].click(),
                          ]);
                        }
                      }
                    });
                    flg = true;
                  }
                }
              }
            }).catch((a) => {
              Logger.error(a + "email error");
            });
          }
        }).catch(() => {
          Logger.error("search error");
        });
        return flg;
      }
    }
    return true;
  }
  async playSingle(main: ElementHandle): Promise<boolean> {
    Logger.info("playsingle");
    const kuji = await main.$("div.btn-kuji");
    if (kuji != null) {
      const btn = await kuji.$("img");
      if (btn != null) {
        const val = await btn.evaluate((x) => x.getAttribute("alt"));
        if (val === "くじをひく") {
          await btn.click();
          return true;
        } else if (val === "明日も参加してね") {
          Logger.info("already gamed");
          return true;
        }
      }
    }
    return false;
  }

  async playChoice(main: ElementHandle): Promise<boolean> {
    Logger.info("playchoice");
    const kuji = await main.$("div.kujidetail-main");
    if (kuji != null) {
      const btn = await kuji.$("img");
      if (btn != null) {
        const val = await btn.evaluate((x) => x.getAttribute("alt"));
        if (val != null) {
          Logger.info("already gamed");
        } else {
          await btn.click();
        }
        return true;
      }
    }
    return false;
  }

  async playGame(page: Page) {
    await wait(2);
    const main = await page.$("main.main");
    if (main != null) {
      if (!await this.playSingle(main)) {
        if (!await this.playChoice(main)) {
          Logger.error("not play:" + await page.title());
        }
      }
    }
  }

  async GetTables() {
    // main処理
    const launch_opt = {
      channel: "chrome",
      args: ["--lang=ja,en-US,en"], // デフォルトでは言語設定が英語なので日本語に変更
      headless: false,
      ignoreDefaultArgs: ["--enable-automation"],
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
          if (list.indexOf(title) == -1) {
            newPage = p;
          }
        }
        if (newPage != null) {
          const flg = await this.loginIfNeed(newPage);
          if (flg) {
            Logger.info("playgame");
            await this.playGame(newPage);
          }
          await newPage.close();
          Logger.info("end game");
          await wait(3);
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
await maker.GetTables();

Logger.info("fin");
