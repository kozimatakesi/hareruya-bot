const puppetter = require('puppeteer');
const line = require('@line/bot-sdk'); // Messaging APIのSDKをインポート

const lineConfig = {
  channelAccessToken: 'w6VjWFqXigMZhPTwkqq5aQZBd563o04eEvUNQTKTUp87LGfliqD0O5BPl7431xeZeWwU2OJlvfo7/TOpoWnFW2NhjqcYNK5AG9rcqEvF9hoTM+6/JuCWYxnRnVkKn2jq1Ua8q2E/qbN8mcQtssAViQdB04t89/1O/w1cDnyilFU=', // 環境変数からアクセストークンをセットしています
  channelSecret: '98cf4cabb5c2bcd86b00de14fb8814cd', // 環境変数からChannel Secretをセットしています
};
// -----------------------------------------------------------------------------
// ルーター設定
// APIコールのためのクライアントインスタンスを作成
const bot = new line.Client(lineConfig);


const pushLine = (message) => {
  bot.pushMessage('U6b3963a1368a4879d411264a6950a01d', {
    type: 'text',
    text: message,
  });
}

//引数が数値であればそのまま、文字列であれば対応したエキスパンションナンバーをURLに入れ、そこから価格TOP５のカード名と価格をLINEにプッシュする関数
exports.rankValue = async (nameArray) => {
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
    const inputNumberName = expName.filter(data => data.value === nameArray)
    pushLine(`エキスパンション:${inputNumberName[0].name}`);
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

//引数に与えられた文字列が含まれるエキスパンションを配列にして返す関数
exports.nameAndValueArray = async (inputMessage) => {
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
