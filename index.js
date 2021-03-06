// モジュールのインポート
const server = require('express')();
const line = require('@line/bot-sdk'); // Messaging APIのSDKをインポート
const fetch = require('node-fetch');
const mysql = require('mysql');
const puppetter = require('puppeteer');

// -----------------------------------------------------------------------------
// データベース接続
const pool = mysql.createPool({
  host: process.env.SERVER_NAME,
  user: process.env.USER_NAME,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});
// -----------------------------------------------------------------------------
// パラメータ設定
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN, // 環境変数からアクセストークンをセットしています
  channelSecret: process.env.LINE_CHANNEL_SECRET, // 環境変数からChannel Secretをセットしています
};
/*
const lineConfig = {
  channelAccessToken: 'w6VjWFqXigMZhPTwkqq5aQZBd563o04eEvUNQTKTUp87LGfliqD0O5BPl7431xeZeWwU2OJlvfo7/TOpoWnFW2NhjqcYNK5AG9rcqEvF9hoTM+6/JuCWYxnRnVkKn2jq1Ua8q2E/qbN8mcQtssAViQdB04t89/1O/w1cDnyilFU=', // 環境変数からアクセストークンをセットしています
  channelSecret: '98cf4cabb5c2bcd86b00de14fb8814cd', // 環境変数からChannel Secretをセットしています
};
*/
// -----------------------------------------------------------------------------
// Webサーバー設定
server.listen(process.env.PORT || 3000);

// -----------------------------------------------------------------------------
// ルーター設定
// APIコールのためのクライアントインスタンスを作成
const bot = new line.Client(lineConfig);

// -----------------------------------------------------------------------------
// ルーター設定
server.post('/webhook', line.middleware(lineConfig), (req, res) => {
  // 先行してLINE側にステータスコード200でレスポンスする。
  res.sendStatus(200);

  // すべてのイベント処理のプロミスを格納する配列。
  const eventsProcessed = [];

  // イベントオブジェクトを順次処理。
  req.body.events.forEach((event) => {
    // この処理の対象をイベントタイプがメッセージで、かつ、テキストタイプだった場合に限定。
    if (event.type === 'message' && event.message.type === 'text') {
      // ユーザーからのテキストメッセージが「こんにちは」だった場合のみ反応。
      if (event.message.text === 'こんにちは') {
        fetch('http://api.openweathermap.org/data/2.5/weather?q=Tokyo&appid=9a4d371b6fc452d3edd2f79b142c8c18&lang=ja&units=metric')
          .then((res) => res.json())
          .then((json) => {
            eventsProcessed.push(bot.replyMessage(event.replyToken, {
              type: 'text',
              text: json.weather[0].description,
            }));
          });
      }
      if (event.message.text === 'ありがとう') {
        eventsProcessed.push(bot.replyMessage(event.replyToken, {
          type: 'text',
          text: 'どういたしましてやんけ',
        }));
        bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
          type: 'text',
          text: 'そうとはいうけれども',
        });
      }
      if (event.message.text === '読み込む') {
        pool.getConnection((err, connection) => {
          connection.query(
            'SELECT * FROM cards WHERE id = ? ',
            [1],
            (error, results) => {
              eventsProcessed.push(bot.replyMessage(event.replyToken, {
                type: 'text',
                text: results[0].name,
              }));
              connection.release();
            },
          );
        });
      }
      // 「?」を入力したあとの文字と価格[2000]をデータベースに書き込む
      if (event.message.text.match('¥')) {
        const inputMessage = event.message.text.slice(1);
        pool.getConnection((err, connection) => {
          connection.query(
            'INSERT INTO cards(name, price) VALUES (?, ?)',
            [inputMessage, 2000],
            (error, results) => {
              eventsProcessed.push(bot.replyMessage(event.replyToken, {
                type: 'text',
                text: inputMessage,
              }));
              connection.release();
            },
          );
        });
      }

      if (event.message.text.match('!')) {
        bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
          type: 'text',
          text: 'データ取得中、しばらくお待ちください',
        });
        const inputMessage = event.message.text.slice(1);

        !(async () => {
          try {
            const browser = await puppetter.launch({
              args: ['--no-sandbox'],
            });
            const page = await browser.newPage();
            await page.goto('https://www.hareruyamtg.com/ja/products/search');

            if (inputMessage === '') {
              bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
                type: 'text',
                text: '見当たりませんでした',
              });
              browser.close();
              return;
            }

            const datas = await page.evaluate(() => {
              const list = [...document.querySelectorAll('#front_product_search_cardset option')];
              return list.map((data) => ({ name: data.textContent, value: data.value }));
            });

            const nameArray = [];
            for (let i = 0; i < datas.length; i++) {
              if (datas[i].name.match(inputMessage)) {
                nameArray.push(datas[i]);
              }
            }
            console.log(nameArray);

            if (nameArray.length === 0) {
              bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
                type: 'text',
                text: '見当たりませんでした',
              });
              browser.close();
              return;
            }

            const manyExpantion = [];
            if (nameArray.length > 1) {
              for (let j = 0; j < nameArray.length; j++) {
                manyExpantion.push(`「${nameArray[j].name}」は「${nameArray[j].value}」です`);
              }
              const joinArray = manyExpantion.join('\n---------------------------------------------\n');
              console.log(joinArray);
              bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
                type: 'text',
                text: `${joinArray}`,
              });
              bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
                type: 'text',
                text: '複数一致しています、知りたいエキスパンションのナンバーを入力してください',
              });
            } else {
              bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
                type: 'text',
                text: `エキスパンション:${nameArray[0].name}`,
              });
              !(async () => {
                try {
                  const browser = await puppetter.launch({
                    args: ['--no-sandbox'],
                  });
                  const page = await browser.newPage();
                  await page.goto(`https://www.hareruyamtg.com/ja/purchase/search?cardset=${nameArray[0].value}&rarity%5B0%5D=4&rarity%5B1%5D=3&foilFlg%5B0%5D=0&purchaseFlg=1&sort=price&order=DESC&page=1`);
                  // datasにitemNameの値を全て取得後、配列にして代入
                  const datas = await page.evaluate(() => {
                    const list = [...document.querySelectorAll('.itemName')];
                    return list.map((data) => data.textContent.trim());
                  });
                  // pricesにitemDetail__priceの値を全て取得後、配列にして代入
                  const prices = await page.evaluate(() => {
                    const list = [...document.querySelectorAll('.itemDetail__price')];
                    return list.map((data) => data.textContent);
                  });

                  let i = 0;
                  const countUp = () => {
                    bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
                      type: 'text',
                      text: `第${i + 1}位\n${datas[i]}\n${prices[i]}`,
                    });
                    console.log(i++);
                  };
                  const intervalId = setInterval(() => {
                    countUp();
                    if (i >= 5) {
                      clearInterval(intervalId);
                    }
                  }, 500);
                  browser.close();
                } catch (e) {
                  console.error(e);
                }
              })();
            }
            browser.close();
          } catch (e) {
            console.error(e);
          }
        })();
      }

      if (event.message.text.match(/[0-9]{1,3}/)) {
        bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
          type: 'text',
          text: 'データ取得中、しばらくお待ちください',
        });
        !(async () => {
          try {
            const browser = await puppetter.launch({
              args: ['--no-sandbox'],
            });
            const page = await browser.newPage();
            await page.goto(`https://www.hareruyamtg.com/ja/purchase/search?cardset=${event.message.text}&rarity%5B0%5D=4&rarity%5B1%5D=3&foilFlg%5B0%5D=0&purchaseFlg=1&sort=price&order=DESC&page=1`);

            // エキスパンション名の取得
            const expName = await page.evaluate(() => {
              const list = [...document.querySelectorAll('#front_product_search_cardset option')];
              return list.map((data) => ({ name: data.textContent, value: data.value }));
            });

            for (let i = 0; i < expName.length; i++) {
              if (expName[i].value === event.message.text) {
                bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
                  type: 'text',
                  text: `エキスパンション:${expName[i].name}`,
                });
              }
            }
            // datasにitemNameの値を全て取得後、配列にして代入
            const datas = await page.evaluate(() => {
              const list = [...document.querySelectorAll('.itemName')];
              return list.map((data) => data.textContent.trim());
            });
            // pricesにitemDetail__priceの値を全て取得後、配列にして代入
            const prices = await page.evaluate(() => {
              const list = [...document.querySelectorAll('.itemDetail__price')];
              return list.map((data) => data.textContent);
            });

            let i = 0;
            const countUp = () => {
              bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
                type: 'text',
                text: `第${i + 1}位\n${datas[i]}\n${prices[i]}`,
              });
              console.log(i++);
            };
            const intervalId = setInterval(() => {
              countUp();
              if (i >= 5) {
                clearInterval(intervalId);
              }
            }, 500);
            browser.close();
          } catch (e) {
            console.error(e);
          }
        })();
      }

      if (event.message.text === 'プペッター') {
        !(async () => {
          try {
            const browser = await puppetter.launch({
              args: ['--no-sandbox'],
            });
            const page = await browser.newPage();
            await page.goto('https://www.hareruyamtg.com/ja/products/search?cardset=242&rarity%5B0%5D=4&rarity%5B1%5D=3&foilFlg%5B0%5D=0&sort=price&order=DESC&page=1');
            // datasにitemNameの値を全て取得後、配列にして代入
            const datas = await page.evaluate(() => {
              const list = [...document.querySelectorAll('.itemName')];
              return list.map((data) => data.textContent.trim());
            });

            // pricesにitemDetail__priceの値を全て取得後、配列にして代入
            const prices = await page.evaluate(() => {
              const list = [...document.querySelectorAll('.itemDetail__price')];
              return list.map((data) => data.textContent);
            });

            bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
              type: 'text',
              text: `${datas[0]}は${prices[0]}`,
            });

            bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
              type: 'text',
              text: `${datas[5]}は${prices[5]}`,
            });

            browser.close();
          } catch (e) {
            console.error(e);
          }
        })();
      }
    }
  });
});
// -----------------------------------------------------------------------------
/*
const hogehoge = async (input) => {
  try {
    const browser = await puppetter.launch({
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();
    // 晴れる屋のサイトに遷移
    await page.goto('https://www.hareruyamtg.com/ja/products/search');

    // datasにitemNameの値を全て取得後、配列にして代入
    const datas = await page.evaluate(() => {
      const list = [...document.querySelectorAll('#front_product_search_cardset option')];
      return list.map((data) => ({ name: data.textContent, value: data.value }));
    });
      // 上位５枚のカード名と値段を表示
    const nameArray = [];
    for (let i = 0; i < datas.length; i++) {
      if (datas[i].name.match(input)) {
        nameArray.push(datas[i]);
      }
    }
    browser.close();
  } catch (e) {
    console.error(e);
  }
};
*/
