const line = require('@line/bot-sdk'); // Messaging APIのSDKをインポート
require('dotenv').config();

const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN, // 環境変数からアクセストークンをセットしています
  channelSecret: process.env.LINE_CHANNEL_SECRET, // 環境変数からChannel Secretをセットしています
};
// -----------------------------------------------------------------------------
// ルーター設定
// APIコールのためのクライアントインスタンスを作成
const bot = new line.Client(lineConfig);
exports.pushLine = (userId, message) => {
  bot.pushMessage(userId, {
    type: 'text',
    text: message,
  });
};
