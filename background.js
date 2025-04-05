// バックグラウンドスクリプト
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'navigateToUrl') {
    // アクティブなタブを取得して更新
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url: request.url }, (tab) => {
          // タブの更新が完了したら成功を返す
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'Active tab not found' });
      }
    });
    return true; // 非同期レスポンスのために必要
  }
});
