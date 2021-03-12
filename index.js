// モジュールのインポート
const server = require('express')();
const line = require('@line/bot-sdk'); // Messaging APIのSDKをインポート
const fetch = require('node-fetch');
// const mysql = require('mysql');
const { pushLine, rankValue, nameAndValueArray } = require('./function.js');
require('dotenv').config();

// -----------------------------------------------------------------------------
// データベース接続
/*
const pool = mysql.createPool({
  host: process.env.SERVER_NAME,
  user: process.env.USER_NAME,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});
*/
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
// 関数の定義
// -----------------------------------------------------------------------------
// ルーター設定
server.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  // 先行してLINE側にステータスコード200でレスポンスする。
  res.sendStatus(200);

  //events配列から配列の0番目の要素だけを変数に代入
  const [lineEvent] = req.body.events;
  if(!lineEvent){
    return;
  }
  const { userId } = lineEvent.source.userId;

  if(lineEvent.type !== 'message' || lineEvent.message.type !== 'text'){
    return;
  }

  if(!lineEvent.message.text.match('!')){
    return;
  }
  // 「!」入力後の文字列が含まれるエキスパンションを検索
  pushLine(userId, 'データ取得中、しばらくお待ちください');
  const inputMessage = lineEvent.message.text.slice(1);
  const nameArray = await nameAndValueArray(inputMessage);
  console.log(nameArray);
  // 「!」だけ入力された場合と入力された文字列が含まれるエキスパンションがなかった場合
  if (nameArray.length === 0 || inputMessage === '') {
    pushLine('見当たりませんでした');

  // 入力された文字列が含まれるエキスパンションが複数あった場合
  } else if (nameArray.length > 1) {
    const manyExpantion = nameArray.map((data) => `「${data.name}」は「${data.value}」です`);
    const joinArray = manyExpantion.join('\n---------------------------------------------\n');
    console.log(joinArray);
    pushLine(userId, `${joinArray}`);
    pushLine(userId,'複数一致しています、知りたいエキスパンションのナンバーを入力してください');
  // 入力された文字列が含まれるエキスパンションが一つだった場合
  } else {
    pushLine(userId,`エキスパンション:${nameArray[0].name}`);
    exportFunction.rankValue(nameArray);
  }
  // エキスパンションナンバー（3桁以内の数値）を入力した場合
  if (lineEvent.message.text.match(/[0-9]{1,3}/)) {
    pushLine(userId,'データ取得中、しばらくお待ちください');
    rankValue(`${lineEvent.message.text}`);
  }
});
// -----------------------------------------------------------------------------
