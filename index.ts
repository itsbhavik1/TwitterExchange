require('dotenv').config();
import { getTokenFromLLM } from './get-token-from-llm';
import { getTweets } from './get-tweets';
import { swapAptosToken } from './swap';

const APTOS_DECIMALS = 8; // Aptos uses 8 decimal places for its native token
const APTOS_AMOUNT = 0.001 * Math.pow(10, APTOS_DECIMALS);

async function main(userName: string) {
  const newTweets = await getTweets(userName);
  console.log(newTweets);
  for (let tweet of newTweets) {
    const tokenAddress = await getTokenFromLLM(tweet.contents);
    if (tokenAddress !== 'null') {
      console.log(`Trying to execute tweet => ${tweet.contents}`);
      await swapAptosToken(tokenAddress, '0x1::aptos_coin::AptosCoin', APTOS_AMOUNT);
    }
  }
}

main('BotChrome114342');
