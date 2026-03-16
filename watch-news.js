import { chromium } from 'playwright';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';

// 自动查找 openclaw.mjs，也可通过 OPENCLAW_MJS 环境变量指定
function resolveOpenclawMjs() {
  if (process.env.OPENCLAW_MJS) return process.env.OPENCLAW_MJS;
  try {
    const { execSync } = await import('child_process');
    const out = execSync('where openclaw 2>nul', { encoding: 'utf8' }).trim().split('\n')[0].trim();
    if (out && out.endsWith('.cmd')) {
      const dir = path.dirname(out);
      const candidate = path.join(dir, 'node_modules', 'openclaw', 'openclaw.mjs');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch (_) {}
  throw new Error('请设置环境变量 OPENCLAW_MJS=<path/to/openclaw.mjs>');
}
const OPENCLAW_MJS = resolveOpenclawMjs();

function runOpenclaw(args) {
  return execFileSync('node', [OPENCLAW_MJS, ...args], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}
import os from 'os';

/**
 * News Watcher - 浣跨敤 Playwright 鐩戝惉铏氭嫙璐у竵鏂伴椈
 * 閫氳繃鍝堝笇鍙樺寲妫€娴嬶紝鏂伴椈鏈夋洿鏂版椂瑙﹀彂
 */

// 鉁?淇锛氫娇鐢ㄦ纭殑 Windows 缂撳瓨璺緞
const dataDir = process.env.USERPROFILE || os.homedir();
const cacheDir = path.join(dataDir, '.openclaw', 'cache');
const cacheFile = path.join(cacheDir, 'news-hash.json');

// 缃戠珯閰嶇疆
const sites = {
  coindesk: {
    url: 'https://www.coindesk.com/zh',
    selector: 'a[href*="/zh/"]', // CoinDesk 鐢?link 鏍囩
    getContent: () => document.querySelectorAll('a[href*="/zh/"]')
      .forEach((a, i) => console.log(`${i}: ${a.textContent?.slice(0, 50) || 'N/A'}`))
  },
  panews: {
    url: 'https://www.panewslab.com/zh',
    selector: '.news-item',
    getContent: () => document.querySelectorAll('.news-item')
      .forEach((a, i) => console.log(`${i}: ${a.textContent?.slice(0, 100) || 'N/A'}`))
  }
};

// 璁＄畻鍐呭鍝堝笇
function hashContent(content) {
  return createHash('md5').update(content).digest('hex');
}

// 璇诲彇涓婃鍝堝笇
function getLastHash() {
  try {
    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return data.hash || null;
    }
  } catch (e) {
    console.warn('鏃犳硶璇诲彇缂撳瓨:', e.message);
  }
  return null;
}

// 淇濆瓨褰撳墠鍝堝笇
function saveHash(hash) {
  try {
    // 鉁?纭繚缂撳瓨鐩綍瀛樺湪
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify({ 
      hash, 
      timestamp: Date.now() 
    }), 'utf8');
    console.log(`  馃捑 缂撳瓨宸蹭繚瀛? ${cacheFile}`);
  } catch (e) {
    console.error('鏃犳硶淇濆瓨鍝堝笇:', e.message);
  }
}

// 鍙戦€侀娆¤繛鎺ユ祴璇曚俊鎭紙鍖呭惈鏈€鏂版枃绔犲叏鏂囨€荤粨锛?
async function sendFirstConnectionTest(latest, fullContent, siteName) {
  try {
    const telegramId = process.env.TELEGRAM_TARGET || 'YOUR_TELEGRAM_CHAT_ID';
    
    console.log('馃 璋冪敤 OpenClaw Agent 杩涜棣栨鎬荤粨...');
    const summary = await summarizeNews(latest.title, fullContent);
    
    const message = `鉁?News Watcher 棣栨杩炴帴娴嬭瘯

馃摪 鐩戝惉缃戠珯: ${siteName.toUpperCase()}
馃攳 鐩戝惉鐘舵€? 宸插惎鍔?

馃搶 鏈€鏂版枃绔犳€荤粨:
${summary}

馃敆 ${latest.url}

馃挕 涔嬪悗鏈夋柊鏂囩珷鍙戝竷鏃讹紝浼氳嚜鍔ㄦ姄鍙栧叏鏂囨€荤粨骞跺彂閫併€?
鈴?${new Date().toLocaleString('zh-CN')}`;
    
    console.log('馃摠 鍙戦€侀娆¤繛鎺ユ祴璇曞埌 Telegram...');
    try {
      runOpenclaw(['message', 'send', '--channel', 'telegram', '--target', telegramId, '--message', message]);
      console.log('鉁?娴嬭瘯娑堟伅鍙戦€佹垚鍔焅n');
      return true;
    } catch (execError) {
      console.error('馃摠 鍛戒护鎵ц澶辫触:', execError.message);
      console.error('  stdout:', execError.stdout || '(绌?');
      console.error('  stderr:', execError.stderr || '(绌?');
      throw execError;
    }
  } catch (error) {
    console.error('鉂?鍙戦€佹祴璇曟秷鎭け璐?', error.message);
    return false;
  }
}

// 璋冪敤 openclaw agent 鎬荤粨鏂伴椈鍏ㄦ枃
async function summarizeNews(articleTitle, articleContent) {
  try {
    console.log('馃 璋冪敤 OpenClaw Agent 杩涜鎬荤粨...');
    
    const prompt = `浠ヤ笅鏄竴绡囨潵鑷?CoinDesk 鐨勫姞瀵嗚揣甯佹柊闂诲叏鏂囷紝璇风敤涓枃杩涜鎬荤粨鍒嗘瀽锛屼笉瑕佽闂换浣曠綉鍧€锛?

鏍囬锛?{articleTitle}

姝ｆ枃锛?
${articleContent.slice(0, 4000)}

璇风敤涓枃鍥炲锛岃姹傦細
1. 鏍稿績浜嬩欢鏄粈涔堬紙2-3鍙ヨ瘽锛?
2. 瀵瑰姞瀵嗚揣甯佸競鍦烘湁浣曞奖鍝?
3. 閲嶈鎬ц瘎绾э紙楂?涓?浣庯級鍙婄悊鐢?
鏍煎紡绠€娲侊紝閫傚悎 Telegram 闃呰锛屾帶鍒跺湪400瀛椾互鍐卄;

    // 璋冪敤 openclaw agent
    console.log('鈴?绛夊緟鎬荤粨缁撴灉...');
    const result = runOpenclaw(['agent', '--agent', 'main', '--message', prompt, '--thinking', 'off', '--timeout', '90']);
    
    console.log('鉁?鎬荤粨瀹屾垚');
    return result;
    
  } catch (error) {
    console.error('鉂?鎬荤粨澶辫触:', error.message);
    return `锛堟€荤粨澶辫触锛?{articleTitle}`;
  }
}

// 鍙戦€佹柊鏂囩珷鎬荤粨鍒?Telegram
async function sendToTelegram(latest, fullContent, siteName) {
  try {
    const telegramId = process.env.TELEGRAM_TARGET || 'YOUR_TELEGRAM_CHAT_ID';
    
    const summary = await summarizeNews(latest.title, fullContent);
    
    const message = `馃敂 ${siteName.toUpperCase()} 鏂版枃绔?

馃摪 ${latest.title}

${summary}

馃敆 ${latest.url}
鈴?${new Date().toLocaleString('zh-CN')}`;
    
    console.log('馃摠 鍙戦€佸埌 Telegram...');
    try {
      runOpenclaw(['message', 'send', '--channel', 'telegram', '--target', telegramId, '--message', message]);
      console.log('鉁?Telegram 鍙戦€佹垚鍔焅n');
      return true;
    } catch (execError) {
      console.error('馃摠 鍛戒护鎵ц澶辫触:', execError.message);
      console.error('  stdout:', execError.stdout || '(绌?');
      console.error('  stderr:', execError.stderr || '(绌?');
      throw execError;
    }
  } catch (error) {
    console.error('鉂?鍙戦€?Telegram 澶辫触:', error.message);
    return false;
  }
}

// 鎻愬彇涓婚〉鏈€鏂颁竴鏉℃枃绔犵殑閾炬帴鍜屾爣棰?
async function extractLatestArticle(page) {
  return await page.evaluate(() => {
    // 鍖归厤鏂伴椈鏂囩珷閾炬帴锛堟帓闄や环鏍笺€佽棰戙€佷綔鑰呯瓑椤甸潰锛?
    const links = Array.from(document.querySelectorAll('a[href]'))
      .filter(a => a.href.match(/coindesk\.com\/zh\/(markets|policy|business|tech|finance|web3|daybook)\//));
    if (links.length === 0) return null;
    const el = links[0];
    const lines = (el.textContent || '').trim().split('\n').map(l => l.trim()).filter(l => l.length > 5);
    return {
      url: el.href,
      title: lines[0] || '锛堟棤鏍囬锛?,
      subtitle: lines[1] || ''
    };
  });
}

// 杩涘叆鏂囩珷椤甸潰鎻愬彇鍏ㄦ枃
async function extractArticleContent(page, articleUrl, mainUrl) {
  console.log(`  馃摉 璇诲彇鏂囩珷鍏ㄦ枃...`);
  await page.goto(articleUrl, { waitUntil: 'load', timeout: 30000 });
  
  const content = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return '';
    const blocks = Array.from(main.querySelectorAll('h1, h2, h3, h4, p'))
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 10)
      .join('\n\n');
    return blocks;
  });
  
  // 璇诲畬鏂囩珷鍚庡洖鍒颁富椤碉紝涓轰笅娆℃鏌ュ仛鍑嗗
  try {
    await page.goto(mainUrl, { waitUntil: 'load', timeout: 30000 });
  } catch (e) { /* 蹇界暐 */ }
  
  console.log(`  馃搫 鑾峰彇鍒板叏鏂?${content.length} 瀛楃`);
  return content;
}

// 涓荤洃鍚嚱鏁帮紙浼樺寲鐗堟湰锛?
async function watchNews(siteName = 'coindesk', checkInterval = 60) {
  const site = sites[siteName];
  if (!site) {
    throw new Error(`鏈煡鐨勭綉绔? ${siteName}. 鏀寔: ${Object.keys(sites).join(', ')}`);
  }

  console.log(`\n馃殌 寮€濮嬬洃鍚?${siteName.toUpperCase()} 鏂伴椈...`);
  console.log(`馃搷 URL: ${site.url}`);
  console.log(`鈴憋笍  妫€鏌ラ棿闅? ${checkInterval}绉抈);
  console.log(`锟?缂撳瓨浣嶇疆: ${cacheFile}`);
  console.log(`锟金煔?鎬ц兘浼樺寲: 淇濇寔杩炴帴 + 蹇€熷姞杞絓n`);

  // 浣跨敤鏈湴 Chrome 鑰屼笉鏄笅杞?Chromium
  const chromeExePath = process.env.CHROME_PATH || 
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  // 鈿?浼樺寲 1: 涓€娆″惎鍔紝淇濇寔杩炴帴
  const browser = await chromium.launch({
    executablePath: chromeExePath,
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    args: ['--disable-blink-features=AutomationControlled'] // 闅愯棌鑷姩鍖栨爣蹇?
  });

  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  // 绗竴娆¤闂紝寤虹珛杩炴帴
  try {
    console.log('馃摗 鍒濆鍖栬繛鎺?..');
    await page.goto(site.url, { waitUntil: 'load', timeout: 30000 });
  } catch (e) {
    console.error('鍒濆杩炴帴澶辫触:', e.message);
    await browser.close();
    throw e;
  }

  let checkCount = 0;
  let lastHash = getLastHash();

  try {
    while (true) {
      checkCount++;
      const timestamp = new Date().toLocaleString('zh-CN');
      
      console.log(`[${timestamp}] 妫€鏌?#${checkCount}...`);
      const startTime = Date.now();

      try {
        // 鐢?reload 鍒锋柊涓婚〉
        await page.reload({ waitUntil: 'load', timeout: 15000 });
        
        // 鎻愬彇鏈€鏂颁竴鏉℃枃绔?
        const latest = await extractLatestArticle(page);
        
        if (!latest) {
          console.log(`  鈿狅笍 鏈壘鍒版枃绔犻摼鎺ワ紝璺宠繃鏈妫€鏌);
        } else {
          console.log(`  馃摪 鏈€鏂版枃绔? ${latest.title.slice(0, 60)}`);
          console.log(`  馃敆 閾炬帴: ${latest.url}`);
          
          // 鐢ㄦ枃绔?URL 鍋氬搱甯岋紙URL 鍙樹簡 = 鏈夋柊鏂囩珷缃《锛?
          const currentHash = hashContent(latest.url);
          const elapsed = Date.now() - startTime;
          
          console.log(`  馃攼 褰撳墠鍝堝笇: ${currentHash.slice(0, 8)}...`);
          console.log(`  馃攼 涓婃鍝堝笇: ${lastHash ? lastHash.slice(0, 8) + '...' : '(鏃?- 棣栨杩愯)'}`);

          if (lastHash && currentHash !== lastHash) {
            console.log(`\n鉁?妫€娴嬪埌鏂版枃绔狅紒(${elapsed}ms)`);
            const fullContent = await extractArticleContent(page, latest.url, site.url);
            saveHash(currentHash);
            lastHash = currentHash;
            await sendToTelegram(latest, fullContent, siteName);
            
          } else if (!lastHash) {
            console.log(`  鉁?棣栨妫€鏌ュ畬鎴?(${elapsed}ms)`);
            const fullContent = await extractArticleContent(page, latest.url, site.url);
            saveHash(currentHash);
            lastHash = currentHash;
            await sendFirstConnectionTest(latest, fullContent, siteName);
            
          } else {
            console.log(`  鈩癸笍  鏃犳柊鏂囩珷 (${elapsed}ms)`);
          }
        }

      } catch (error) {
        console.error(`  鉂?閿欒: ${error.message}`);
        // 鍑洪敊鏃跺皾璇曢噸鏂拌闂?
        try {
          console.log('  馃攧 灏濊瘯閲嶆柊杩炴帴...');
          await page.goto(site.url, { waitUntil: 'load', timeout: 30000 });
        } catch (e) {
          console.error('  鉂?閲嶆柊杩炴帴澶辫触');
        }
      }

      // 绛夊緟涓嬩竴娆℃鏌?
      console.log(`鈴?绛夊緟 ${checkInterval}绉掑悗涓嬫妫€鏌?..\n`);
      await new Promise(resolve => setTimeout(resolve, checkInterval * 1000));
    }

  } finally {
    await browser.close();
    console.log('馃洃 鐩戝惉宸插仠姝?);
  }
}

// CLI 鍏ュ彛
async function main() {
  const args = process.argv.slice(2);
  let siteName = 'coindesk';
  let checkInterval = 60;

  // 瑙ｆ瀽鍙傛暟
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--site' && args[i + 1]) {
      siteName = args[++i];
    }
    if (args[i] === '--interval' && args[i + 1]) {
      checkInterval = parseInt(args[++i], 10);
    }
  }

  try {
    await watchNews(siteName, checkInterval);
  } catch (error) {
    console.error('閿欒:', error);
    process.exit(1);
  }
}

main();

