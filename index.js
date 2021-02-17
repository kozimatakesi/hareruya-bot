// -----------------------------------------------------------------------------
// モジュールのインポート
const server = require("express")();
const line = require("@line/bot-sdk"); // Messaging APIのSDKをインポート
const { json } = require("express");
const fetch = require('node-fetch');
const mysql = require('mysql');
// -----------------------------------------------------------------------------
// データベース接続
/*
const connection = mysql.createConnection({
  host: process.env.SERVER_NAME,
  user: process.env.USER_NAME,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});
*/
const pool = mysql.createPool({
  host: process.env.SERVER_NAME,
  user: process.env.USER_NAME,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

/*
pool.connect((err) => {
  if (err) {
    console.log(`error connecting: ${err.stack}`);
    return;
  }
  console.log('success');
});
*/
// -----------------------------------------------------------------------------
// パラメータ設定
const line_config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN, // 環境変数からアクセストークンをセットしています
    channelSecret: process.env.LINE_CHANNEL_SECRET // 環境変数からChannel Secretをセットしています
};

// -----------------------------------------------------------------------------
// Webサーバー設定
server.listen(process.env.PORT || 3000);


// -----------------------------------------------------------------------------
// ルーター設定
// APIコールのためのクライアントインスタンスを作成
const bot = new line.Client(line_config);

// -----------------------------------------------------------------------------
// ルーター設定
server.post('/webhook', line.middleware(line_config), (req, res, next) => {
    // 先行してLINE側にステータスコード200でレスポンスする。
    res.sendStatus(200);

    // すべてのイベント処理のプロミスを格納する配列。
    let events_processed = [];

    // イベントオブジェクトを順次処理。
    req.body.events.forEach((event) => {
        // この処理の対象をイベントタイプがメッセージで、かつ、テキストタイプだった場合に限定。
        if (event.type == "message" && event.message.type == "text"){
          // ユーザーからのテキストメッセージが「こんにちは」だった場合のみ反応。
          if (event.message.text == "こんにちは"){
            fetch('http://api.openweathermap.org/data/2.5/weather?q=Tokyo&appid=9a4d371b6fc452d3edd2f79b142c8c18&lang=ja&units=metric')
            .then(res => res.json())
            .then(json => {
              console.log(json.weather[0].description)
              events_processed.push(bot.replyMessage(event.replyToken, {
                type: "text",
                text: json.weather[0].description
                }));
            });
          }
          if(event.message.text == "ありがとう"){
            events_processed.push(bot.replyMessage(event.replyToken, {
              type: "text",
              text: "どういたしましてやんけ"
            }));
          }
          if(event.message.text == "読み込む"){
            pool.getConnection(function(err, connection) {
              connection.query(
                'SELECT * FROM cards WHERE id = ? ',
                [1],
                (error, results)=> {
                  console.log(results[0].name);
                  events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: results[0].name
                  }));
                  connection.release();
                }
              )
            })
          }
        }
    });

    // すべてのイベント処理が終了したら何個のイベントが処理されたか出力。
    Promise.all(events_processed).then(
        (response) => {
            console.log(`${response.length} event(s) processed.`);
        }
    );
});
// -----------------------------------------------------------------------------
