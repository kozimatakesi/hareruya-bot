// -----------------------------------------------------------------------------
// モジュールのインポート
const server = require("express")();
const line = require("@line/bot-sdk"); // Messaging APIのSDKをインポート
const { json } = require("express");
global.fetch = require('node-fetch');
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
              fetch('http://api.openweathermap.org/data/2.5/weather?q=Tokyo&appid=9a4d371b6fc452d3edd2f79b142c8c18&lang=ja&units=metric').then(res => res.json()).then(json => const nowWeather = json.weather[0].description;);

              // replyMessage()で返信し、そのプロミスをevents_processedに追加。
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: nowWeather
                }));
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
async function callApi(){
  var ress = await fetch("http://api.openweathermap.org/data/2.5/weather?q=Tokyo&appid=9a4d371b6fc452d3edd2f79b142c8c18&lang=ja&units=metric");
  var results = await ress.json();
  console.log(results);
  var nowWeather = results.weather[0].description;
  console.log(nowWeather);
  return nowWeather;
}