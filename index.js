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
/*
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN, // 環境変数からアクセストークンをセットしています
  channelSecret: process.env.LINE_CHANNEL_SECRET, // 環境変数からChannel Secretをセットしています
};
*/
const lineConfig = {
  channelAccessToken: 'w6VjWFqXigMZhPTwkqq5aQZBd563o04eEvUNQTKTUp87LGfliqD0O5BPl7431xeZeWwU2OJlvfo7/TOpoWnFW2NhjqcYNK5AG9rcqEvF9hoTM+6/JuCWYxnRnVkKn2jq1Ua8q2E/qbN8mcQtssAViQdB04t89/1O/w1cDnyilFU=', // 環境変数からアクセストークンをセットしています
  channelSecret: '98cf4cabb5c2bcd86b00de14fb8814cd', // 環境変数からChannel Secretをセットしています
};
// -----------------------------------------------------------------------------
// Webサーバー設定
server.listen(process.env.PORT || 3000);

// -----------------------------------------------------------------------------
// ルーター設定
// APIコールのためのクライアントインスタンスを作成
const bot = new line.Client(lineConfig);



const pupette = async () => {
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
};

//引数に入れた文字列をLineに送信する関数
const pushLine = (message) => {
  bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
    type: 'text',
    text: message,
  });
}

const rankValue = async (nameArray) => {
  let urlNumber = ''
  if(isNaN(nameArray) === false){
    urlNumber = nameArray;
  } else {
    urlNumber = nameArray[0].value;
  }
  const browser = await puppetter.launch({
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(`https://www.hareruyamtg.com/ja/purchase/search?cardset=${urlNumber}&rarity%5B0%5D=4&rarity%5B1%5D=3&foilFlg%5B0%5D=0&purchaseFlg=1&sort=price&order=DESC&page=1`);

  // エキスパンション名の取得
  const expName = await page.evaluate(() => {
    const list = [...document.querySelectorAll('#front_product_search_cardset option')];
    return list.map((data) => ({ name: data.textContent, value: data.value }));
  });
  if(isNaN(nameArray) === false){
    for (let i = 0; i < expName.length; i++) {
      if (expName[i].value === nameArray) {
        pushLine(`エキスパンション:${expName[i].name}`);
      }
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
    pushLine(`第${i + 1}位\n${datas[i]}\n${prices[i]}`);
    console.log(i++);
  };
  const intervalId = setInterval(() => {
    countUp();
    if (i >= 5) {
      clearInterval(intervalId);
    }
  }, 500);
  browser.close();
};

const nameAndValueArray = async (inputMessage) => {
  const browser = await puppetter.launch({
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto('https://www.hareruyamtg.com/ja/products/search');
  const datas = await page.evaluate(() => {
    const list = [...document.querySelectorAll('#front_product_search_cardset option')];
    return list.map((data) => ({ name: data.textContent, value: data.value }));
  });
  //文字列inputMessageがnameに含まれる要素を配列nameArrayに追加
  const nameArray = datas.filter(data => data.name.match(inputMessage));
  browser.close();
  return nameArray;
}


// -----------------------------------------------------------------------------
// ルーター設定
server.post('/webhook', line.middleware(lineConfig), (req, res) => {
  // 先行してLINE側にステータスコード200でレスポンスする。
  res.sendStatus(200);

  // すべてのイベント処理のプロミスを格納する配列。
  const eventsProcessed = [];

  const mainFunction = async() => {
  // イベントオブジェクトを順次処理。
    req.body.events.forEach((event) => {
      // この処理の対象をイベントタイプがメッセージで、かつ、テキストタイプだった場合に限定。
      if (event.type === 'message' && event.message.type === 'text') {
        // ユーザーからのテキストメッセージが「こんにちは」だった場合のみ反応。東京の天気を返す
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
        //「!」入力後の文字列が含まれるエキスパンションを検索
        if (event.message.text.match('!')) {
          pushLine('データ取得中、しばらくお待ちください');
          const inputMessage = event.message.text.slice(1);
          (async () => {
            const nameArray = await nameAndValueArray(inputMessage);
            console.log(nameArray);
            //「!」だけ入力された場合と入力された文字列が含まれるエキスパンションがなかった場合
            if (nameArray.length === 0 || inputMessage === '') {
              pushLine('見当たりませんでした');
              return;
            //入力された文字列が含まれるエキスパンションが複数あった場合
            } else if(nameArray.length > 1) {
              const manyExpantion = nameArray.map(data => `「${data.name}」は「${data.value}」です`) ;
              const joinArray = manyExpantion.join('\n---------------------------------------------\n');
              console.log(joinArray);
              pushLine(`${joinArray}`);
              pushLine('複数一致しています、知りたいエキスパンションのナンバーを入力してください');
            //入力された文字列が含まれるエキスパンションが一つだった場合
            } else {
              pushLine(`エキスパンション:${nameArray[0].name}`);
              rankValue(nameArray);
            }
          })();
        }
        //エキスパンションナンバー（3桁以内の数値）を入力した場合
        if (event.message.text.match(/[0-9]{1,3}/)) {
          pushLine('データ取得中、しばらくお待ちください');
          (async () => {
            rankValue(`${event.message.text}`);
          })();
        }
      }
    });
  }

  mainFunction();

});