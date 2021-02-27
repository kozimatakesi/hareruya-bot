// モジュールのインポート
const server = require('express')();
const line = require('@line/bot-sdk'); // Messaging APIのSDKをインポート
const fetch = require('node-fetch');
const mysql = require('mysql');
const jsdom = require('jsdom');
const puppetter = require('puppeteer');
const { JSDOM } = jsdom;
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
    if (event.type === 'sticker') {
      bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
        type: 'text',
        text: 'スタンプを送るな！',
      });
    }
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
          text: 'いかがなもんかね',
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
      /*
      if (event.message.text.match('!')) {
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
      */

      if (event.message.text.match('!')) {
        const inputMessage = event.message.text.slice(1);
        const selectExpantions = hogehoge(inputMessage);
        eventsProcessed.push(bot.replyMessage(event.replyToken, {
          type: 'text',
          text: selectExpantions[1].name,
        }));
      }

      if(event.message.text === 'プペッター'){
        !(async () => {
          try {
            const browser = await puppetter.launch({
              args: ['--no-sandbox'],
            });
            const page = await browser.newPage();
            await page.goto('https://www.hareruyamtg.com/ja/products/search?cardset=242&rarity%5B0%5D=4&rarity%5B1%5D=3&foilFlg%5B0%5D=0&sort=price&order=DESC&page=1');
            //datasにitemNameの値を全て取得後、配列にして代入
            const datas = await page.evaluate(() => {
              const list = [...document.querySelectorAll('.itemName')];
              return list.map(data => data.textContent.trim());
            });

            //pricesにitemDetail__priceの値を全て取得後、配列にして代入
            const prices = await page.evaluate(() => {
              const list = [...document.querySelectorAll('.itemDetail__price')];
              return list.map(data => data.textContent);
            });

            bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
              type: 'text',
              text: `${datas[0]}は${prices[0]}`,
            });

            bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
              type: 'text',
              text: `${datas[1]}は${prices[1]}`,
            });

            browser.close();
          } catch(e) {
            console.error(e);
          }
        })();
      }
    }
  });
  /*
  // すべてのイベント処理が終了したら何個のイベントが処理されたか出力。
  Promise.all(eventsProcessed).then(
    (response) => {
      console.log(`${response.length} event(s) processed.`);
    },
  );
  */
});
// -----------------------------------------------------------------------------
const hogehoge = async(name) => {
  try {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    //晴れる屋のサイトに遷移
    await page.goto('https://www.hareruyamtg.com/ja/products/search');

    //datasにitemNameの値を全て取得後、配列にして代入
    const datas = await page.evaluate(() => {
      const list = [...document.querySelectorAll('#front_product_search_cardset option')];
      return list.map(data => ({name: data.textContent, value: data.value }));
    });
    //上位５枚のカード名と値段を表示
    const nameArray = [];
    for(let i = 0; i < datas.length; i++){
      if(datas[i].name.match(name)) {
        nameArray.push(datas[i]);
      }
    }
    browser.close()
    return nameArray;
  } catch(e) {
    console.error(e)
  }
}