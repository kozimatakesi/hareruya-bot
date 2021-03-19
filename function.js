// モジュールのインポート
const puppetter = require('puppeteer');
const { pushLine } = require('./pushLine.js');
require('dotenv').config();

// -----------------------------------------------------------------------------
// 引数が数値であればそのまま、文字列であれば対応したエキスパンションナンバーをURLに入れ、そこから価格TOP５のカード名と価格をLINEにプッシュする関数
exports.rankValue = async (userId, nameArray) => {
  const urlNumber = isNaN(nameArray) === false ? nameArray : nameArray[0].value;
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
  if (isNaN(nameArray) === false) {
    const inputNumberName = expName.filter((data) => data.value === nameArray);
    pushLine(userId, `エキスパンション:${inputNumberName[0].name}`);
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
  // 表示用の配列作成、JP且つ、500円以上
  const jpOnlyArray = [];
  let y = 1;
  for (let i = 0; i < datas.length; i++) {
    if (datas[i].slice(1, 3) === 'JP' && !(prices[i].slice(2) < 500)) {
      jpOnlyArray.push(`第${y}位\n${datas[i]}\n${prices[i]}\n--------------------------------------------------\n`);
      y++;
    }
  }
  if (jpOnlyArray.length === 0) {
    pushLine(userId, '公式サイトをご覧ください');
    browser.close();
    return;
  }
  pushLine(userId, jpOnlyArray.join(''));
  browser.close();
};

// 引数に与えられた文字列が含まれるエキスパンションを配列にして返す関数
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
  // 文字列inputMessageがnameに含まれる要素を配列nameArrayに追加
  const nameArray = datas.filter((data) => data.name.match(inputMessage));
  browser.close();
  return nameArray;
};

// 「!」を入力した後にエキスパンションナンバーを入力した時、アンコモンの買取を表示する
exports.uncommonSerch = async (userId, nameArray) => {
  const urlNumber = isNaN(nameArray) === false ? nameArray : nameArray[0].value;
  const browser = await puppetter.launch({
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(`https://www.hareruyamtg.com/ja/purchase/search?cardset=${urlNumber}&rarity=2&foilFlg%5B0%5D=0&purchaseFlg=1&sort=price&order=DESC&page=1`);
  // エキスパンション名の取得
  const expName = await page.evaluate(() => {
    const list = [...document.querySelectorAll('#front_product_search_cardset option')];
    return list.map((data) => ({ name: data.textContent, value: data.value }));
  });
  if (isNaN(nameArray) === false) {
    const inputNumberName = expName.filter((data) => data.value === nameArray);
    pushLine(userId, `エキスパンション:${inputNumberName[0].name}`);
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
  // 表示用の配列作成、JPのみ
  const jpOnlyArray = [];
  let y = 1;
  for (let i = 0; i < datas.length; i++) {
    if (datas[i].slice(1, 3) === 'JP') {
      jpOnlyArray.push(`第${y}位\n${datas[i]}\n${prices[i]}\n--------------------------------------------------\n`);
      y++;
    }
  }
  if (jpOnlyArray.length === 0) {
    pushLine(userId, '該当するカードはありませんでした');
    browser.close();
    return;
  }
  pushLine(userId, jpOnlyArray.join(''));
  browser.close();
};
