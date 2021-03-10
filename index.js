// モジュールのインポート
const server = require('express')();
const line = require('@line/bot-sdk'); // Messaging APIのSDKをインポート
const fetch = require('node-fetch');
const mysql = require('mysql');
const export_function = require('./function.js');
require('dotenv').config();

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
  user_id = req.body.events[0].source.userId;

  (async() => {
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
            const nameArray = await export_function.nameAndValueArray(inputMessage);
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
              export_function.rankValue(nameArray);
            }
          })();
        }
        //エキスパンションナンバー（3桁以内の数値）を入力した場合
        if (event.message.text.match(/[0-9]{1,3}/)) {
          pushLine('データ取得中、しばらくお待ちください');
          export_function.rankValue(`${event.message.text}`);
        }
      }
    });
  })();
});
// -----------------------------------------------------------------------------
//関数の定義
//user_idをfunction.jsに渡すための関数
exports.userIdFunction = () => {
  return user_id;
}
//引数に入れた文字列をLineに送信する関数
const pushLine = (message) => {
  bot.pushMessage(user_id, {
    type: 'text',
    text: message,
  });
}
