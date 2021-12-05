const axios = require('axios').default;

if (process.argv.length < 3) {
	throw new Error('node parse-bscscan.js <URL>')
}

const url = process.argv[2];

let chainMapper = (url) => {
  if (url.match("^https://finder.terra.money")) return 'terra';
  if (url.match("^https://solscan.io")) return "solana";
  if (url.match("^https://explorer.solana.com")) return "solana";
  else return 'erc20';
};

let parser = {
  'erc20': [
    (url) => url,
    (webContent) =>  {
      let dateStr = webContent.match("<i class='far fa-clock .*></i>.* \\((.*) \\+UTC\\)");
      return dateStr ? dateStr[1] : 'UNKNOWN';
    },
    (webContent) =>  {
      let gwei = webContent.match("id=\"ContentPlaceHolder1_spanGasPrice\".*\\(([0-9]+).*Gwei");
      return gwei ? gwei[1] : 'UNKNOWN';
    },
    (webContent) =>  {
      let gas = webContent.match("id=\"ContentPlaceHolder1_spanTxFee\".*</b>(\\d+).*\\(\\$([0-9.]+)\\)");
      return gas ? '0.' + gas[1] : 'UNKNOWN';
    },
    (webContent) =>  {
      let gasPrice = webContent.match("id=\"ContentPlaceHolder1_spanTxFee\".*</b>(\\d+).*\\(\\$([0-9.]+)\\)");
      return gasPrice ? gasPrice[2] : 'UNKNOWN';
    }
  ],
  'terra': [
    (url) => 'https://fcd.terra.dev/v1/tx/' + url.split('/')[5],
    (webContent) =>  {
      let date = new Date(webContent.timestamp);
      return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US');
    },
    (webContent) =>  {
      return 0;
    },
    (webContent) =>  {
      return webContent.gas_used/1000000000;
    },
    (webContent) =>  {
      let fee = parseInt(webContent.tx.value.fee.amount[0].amount);
      return fee/1000000;
    }
  ],
  'solana': [
    (url) => 'https://api.solscan.io/transaction?tx=' + url.split('/')[4],
    (webContent) =>  {
      let date = new Date(webContent.blockTime*1000);
      return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US');
    },
    (webContent) =>  {
      return 0;
    },
    (webContent) =>  {
      return webContent.fee;
    },
    (webContent) =>  {
      return 0;
    }
  ]
};

async function parse(url) {
  console.info("fetching %s", url);
  let chain = chainMapper(url);
  url = parser[chain][0](url);
  let response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion'
    }
  });
  let websiteContent = response.data;
  let parsedDate = parser[chain][1](websiteContent);
  let parsedGwei = parser[chain][2](websiteContent);
  let parsedGas = parser[chain][3](websiteContent);
  let parsedPrice = parser[chain][4](websiteContent);
  console.log(`${parsedDate}\t${parsedGwei}\t${parsedGas}\t${parsedPrice}`);
}

parse(url);

